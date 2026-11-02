import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface RateLimitStatus {
  locked: boolean;
  justLocked?: boolean;
  attempts: number;
  lockedUntil: string | null;
  remainingSeconds: number;
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return '127.0.0.1';
}

export async function checkAuthRateLimit(
  key: string,
  windowMinutes = 15
): Promise<RateLimitStatus> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc('check_rate_limit', {
      p_key: key.toLowerCase().trim(),
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error('Rate limit check RPC error:', error.message);
      return { locked: false, attempts: 0, lockedUntil: null, remainingSeconds: 0 };
    }
    if (!data) {
      return { locked: false, attempts: 0, lockedUntil: null, remainingSeconds: 0 };
    }

    return {
      locked: Boolean(data.locked),
      attempts: Number(data.attempts || 0),
      lockedUntil: data.locked_until || null,
      remainingSeconds: Number(data.remaining_seconds || 0),
    };
  } catch {
    return { locked: false, attempts: 0, lockedUntil: null, remainingSeconds: 0 };
  }
}

export async function recordAuthAttempt(params: {
  key: string;
  scope: 'login' | 'activation' | 'pickup_pin';
  success: boolean;
  targetLabel?: string;
  ipAddress?: string;
  schoolId?: string;
  maxAttempts?: number;
  lockoutMinutes?: number;
}): Promise<RateLimitStatus> {
  const {
    key,
    scope,
    success,
    targetLabel,
    ipAddress = '127.0.0.1',
    schoolId,
    maxAttempts = 5,
    lockoutMinutes = 15,
  } = params;

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc('record_rate_limit_attempt', {
      p_key: key.toLowerCase().trim(),
      p_scope: scope,
      p_success: success,
      p_max_attempts: maxAttempts,
      p_lockout_minutes: lockoutMinutes,
    });

    if (error || !data) {
      return { locked: false, justLocked: false, attempts: 0, lockedUntil: null, remainingSeconds: 0 };
    }

    const result: RateLimitStatus = {
      locked: Boolean(data.locked),
      justLocked: Boolean(data.just_locked),
      attempts: Number(data.attempts || 0),
      lockedUntil: data.locked_until || null,
      remainingSeconds: Number(data.remaining_seconds || 0),
    };

    // On the 5th failed attempt (when lockout triggers), alert the Principal and write to audit_logs
    if (result.justLocked && schoolId) {
      const scopeLabel =
        scope === 'pickup_pin'
          ? 'Guardian Pickup PIN'
          : scope === 'activation'
          ? 'Student Activation Code'
          : 'Portal Sign-In';
      const label = targetLabel || key;
      const summary = `Security Lockout: 5 consecutive failed ${scopeLabel} attempts for "${label}" from IP ${ipAddress}. Locked for ${lockoutMinutes} minutes.`;

      try {
        await sb.from('audit_logs').insert({
          school_id: schoolId,
          actor_role: 'system',
          action:
            scope === 'pickup_pin'
              ? 'SECURITY.PICKUP_PIN_LOCKOUT'
              : scope === 'activation'
              ? 'SECURITY.ACTIVATION_LOCKOUT'
              : 'SECURITY.LOGIN_LOCKOUT',
          resource_type: 'auth_rate_limits',
          ip_address: ipAddress,
          metadata: {
            actor_name: 'Automated Security Monitor',
            summary,
            scope,
            target: label,
            attempts: result.attempts,
            locked_until: result.lockedUntil,
          },
        });
      } catch {
        // Non-blocking audit log
      }

      try {
        // Resolve real principal email and contact from staff_profiles or schools
        let principalEmail: string | null = null;
        let principalName = 'Principal';

        const { data: principalStaff } = await sb
          .from('staff_profiles')
          .select('email, first_name, last_name')
          .eq('school_id', schoolId)
          .or('role.eq.admin,role.eq.principal')
          .limit(1)
          .maybeSingle();

        if (principalStaff?.email) {
          principalEmail = principalStaff.email;
          principalName = `${principalStaff.first_name || ''} ${principalStaff.last_name || ''}`.trim() || 'Principal';
        } else {
          const { data: schoolProfile } = await sb
            .from('schools')
            .select('email')
            .eq('id', schoolId)
            .maybeSingle();
          if (schoolProfile?.email) {
            principalEmail = schoolProfile.email;
          }
        }

        if (principalEmail) await sb.from('notification_logs').insert({
          school_id: schoolId,
          channel: 'email',
          recipient: principalEmail,
          recipient_name: principalName,
          recipient_type: 'staff',
          subject: `Urgent Security Alert: ${scopeLabel} Lockout`,
          body: summary,
          status: 'pending',
          event_type: 'security_lockout',
          metadata: {
            scope,
            target: label,
            ip_address: ipAddress,
            attempts: result.attempts,
            locked_until: result.lockedUntil,
          },
        });
      } catch {
        // Non-blocking notification log
      }
    }

    return result;
  } catch {
    return { locked: false, justLocked: false, attempts: 0, lockedUntil: null, remainingSeconds: 0 };
  }
}

