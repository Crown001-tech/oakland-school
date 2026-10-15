import type { SupabaseClient } from '@supabase/supabase-js';

export interface PrincipalDelegations {
  canOnboardStaff: boolean;
  canSetCalendarEvents: boolean;
  canApproveAdmissions: boolean;
  canEndorseResults: boolean;
  canApproveLeave?: boolean;
  canEditCurriculum?: boolean;
}

export const DEFAULT_DELEGATIONS: PrincipalDelegations = {
  canOnboardStaff: true,
  canSetCalendarEvents: true,
  canApproveAdmissions: true,
  canEndorseResults: true,
  canApproveLeave: true,
  canEditCurriculum: true,
};

/**
 * Client-side helper to load live Principal Delegations from PostgreSQL master settings.
 */
export async function fetchPrincipalDelegations(): Promise<PrincipalDelegations> {
  try {
    const res = await fetch('/api/schools/settings');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.principalDelegations) {
        const d = json.data.principalDelegations;
        return {
          canOnboardStaff: d.canOnboardStaff ?? true,
          canSetCalendarEvents: d.canSetCalendarEvents ?? true,
          canApproveAdmissions: d.canApproveAdmissions ?? true,
          canEndorseResults: d.canEndorseResults ?? true,
          canApproveLeave: d.canApproveLeave ?? true,
          canEditCurriculum: d.canEditCurriculum ?? true,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch live principal delegations:', err);
  }
  return DEFAULT_DELEGATIONS;
}

/**
 * Server-side helper to read live Principal Delegations directly from schools table.
 */
export async function getServerPrincipalDelegations(sb: SupabaseClient): Promise<PrincipalDelegations> {
  try {
    const { data: school } = await sb
      .from('schools')
      .select('settings')
      .limit(1)
      .maybeSingle();

    if (school?.settings?.principalDelegations) {
      const d = school.settings.principalDelegations;
      return {
        canOnboardStaff: d.canOnboardStaff ?? true,
        canSetCalendarEvents: d.canSetCalendarEvents ?? true,
        canApproveAdmissions: d.canApproveAdmissions ?? true,
        canEndorseResults: d.canEndorseResults ?? true,
        canApproveLeave: d.canApproveLeave ?? true,
        canEditCurriculum: d.canEditCurriculum ?? true,
      };
    }
  } catch (err) {
    console.warn('Failed to read server principal delegations:', err);
  }
  return DEFAULT_DELEGATIONS;
}
