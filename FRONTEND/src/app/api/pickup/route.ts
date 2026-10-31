import { NextResponse, type NextRequest } from 'next/server';
import { getCaller, getLinkedStudentIds } from '@/lib/caller';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkAuthRateLimit, extractClientIp, recordAuthAttempt } from '@/lib/rate-limit';

function getAdminClient() {
  return getSupabaseAdmin();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Unique violation raised by a partial unique index (race-condition guard)
function isUniqueViolation(err: any) {
  return err?.code === '23505' || /duplicate key value/i.test(err?.message || '');
}

// Escort must be an active registered person or a linked guardian of this exact student
async function isAuthorizedEscort(sb: any, studentId: string, escortName: string) {
  const target = (escortName || '').trim().toLowerCase();
  if (!target) return false;

  const { data: persons } = await sb
    .from('authorized_pickup_persons')
    .select('full_name')
    .eq('student_id', studentId)
    .eq('is_active', true);
  if ((persons || []).some((p: any) => (p.full_name || '').trim().toLowerCase() === target)) return true;

  const { data: links } = await sb
    .from('student_guardians')
    .select('authorized_pickup, guardians(first_name, last_name)')
    .eq('student_id', studentId);
  return (links || []).some((l: any) => {
    const g = l.guardians;
    if (!g || l.authorized_pickup === false) return false;
    return `${g.first_name} ${g.last_name}`.trim().toLowerCase() === target;
  });
}

// GET /api/pickup - Fetch logs and authorized escorts from PostgreSQL
export async function GET(req: NextRequest) {
  try {
    const caller = await getCaller();
    const isParent = caller.role === 'parent';
    const linkedIds = isParent ? await getLinkedStudentIds(caller.email) : [];
    const sb = getAdminClient();
    const { searchParams } = new URL(req.url);
    const lookupQuery = searchParams.get('query')?.trim().toUpperCase();

    if (isParent && lookupQuery) {
      return NextResponse.json(
        { success: false, message: 'Gate lookups are restricted to security staff.' },
        { status: 403 }
      );
    }

    // 1. Fetch recent pickup logs
    const { data: logsData, error: logsErr } = await sb
      .from('pickup_logs')
      .select('*')
      .order('pickup_time', { ascending: false })
      .limit(50);

    if (logsErr) throw logsErr;

    // 2. Fetch authorized pickup persons
    const { data: personsData, error: personsErr } = await sb
      .from('authorized_pickup_persons')
      .select('*')
      .order('created_at', { ascending: false });

    if (personsErr) throw personsErr;

    // 3. Fetch registered guardians with 4-digit pickup pins
    const { data: sgData, error: sgErr } = await sb
      .from('student_guardians')
      .select(`
        id,
        student_id,
        guardian_id,
        relationship,
        pickup_pin,
        authorized_pickup,
        guardians (
          id,
          first_name,
          last_name,
          phone
        ),
        students (
          id,
          admission_number,
          first_name,
          last_name,
          class_enrollments (
            classes:class_id (
              name
            )
          )
        )
      `);

    if (sgErr) throw sgErr;

    // Compile primary guardians into authorized escorts list
    const guardianEscorts: any[] = [];
    (sgData || []).forEach((sg: any) => {
      const g = sg.guardians;
      const s = sg.students;
      if (g && s) {
        guardianEscorts.push({
          id: `guard-${sg.id}`,
          studentId: sg.student_id,
          studentName: `${s.first_name} ${s.last_name}`.trim(),
          studentClass: s.class_enrollments?.[0]?.classes?.name || 'Enrolled',
          admissionNo: s.admission_number,
          fullName: `${g.first_name} ${g.last_name}`.trim(),
          relationship: sg.relationship || 'Guardian',
          phone: g.phone || '—',
          qrToken: sg.pickup_pin ? `OAK-PK-${sg.pickup_pin}` : '—',
          pickupPin: sg.pickup_pin || '—',
          isActive: sg.authorized_pickup !== false,
          isGuardian: true,
        });
      }
    });

    const registeredEscorts = (personsData || []).map((p: any) => ({
      id: p.id,
      studentId: p.student_id,
      fullName: p.full_name,
      relationship: p.relationship,
      phone: p.phone,
      qrToken: p.qr_token,
      pickupPin: p.qr_token ? (p.qr_token.replace(/\D/g, '').slice(-4) || '—') : '—',
      isActive: p.is_active,
      isGuardian: false,
    }));

    const allEscorts = [...guardianEscorts, ...registeredEscorts];

    const formattedLogs = (logsData || []).map((l: any) => ({
      id: l.id,
      studentId: l.student_id,
      studentName: l.student_name,
      studentClass: l.student_class,
      pickedUpByName: l.picked_up_by_name,
      relationship: l.relationship,
      verifiedByName: l.verified_by_name,
      verificationMethod: l.verification_method,
      status: l.status,
      notes: l.notes || '',
      pickupTime: l.pickup_time,
    }));

    // If lookupQuery is provided, perform authoritative lookup
    if (lookupQuery) {
      const clientIp = extractClientIp(req);
      const pinRateKey = `pickup_pin:${caller.userId || clientIp}`;
      const preCheck = await checkAuthRateLimit(pinRateKey);
      if (preCheck.locked) {
        const waitMins = Math.max(1, Math.ceil(preCheck.remainingSeconds / 60));
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSeconds: preCheck.remainingSeconds,
            message: `Pickup PIN verification locked after 5 failed attempts. Principal alerted. Please wait ${waitMins} minute(s).`,
          },
          { status: 429 }
        );
      }

      // Check by 4-digit PIN or QR token
      const escortMatch = allEscorts.find(
        (e) =>
          e.pickupPin === lookupQuery ||
          e.qrToken.toUpperCase() === lookupQuery ||
          e.fullName.toUpperCase().includes(lookupQuery)
      );

      if (escortMatch) {
        await recordAuthAttempt({
          key: pinRateKey,
          scope: 'pickup_pin',
          success: true,
          targetLabel: lookupQuery,
          ipAddress: clientIp,
        });
        // Fetch student details
        const { data: studentRow } = await sb
          .from('students')
          .select('id, admission_number, first_name, last_name, class_enrollments(classes:class_id(name))')
          .eq('id', escortMatch.studentId)
          .single();

        const student = studentRow
          ? {
              id: studentRow.id,
              name: `${studentRow.first_name} ${studentRow.last_name}`.trim(),
              class: (studentRow.class_enrollments as any)?.[0]?.classes?.name || 'Enrolled',
              admissionNo: studentRow.admission_number,
            }
          : {
              id: escortMatch.studentId,
              name: escortMatch.studentName || 'Student',
              class: escortMatch.studentClass || 'Enrolled',
              admissionNo: escortMatch.admissionNo || '—',
            };

        const studentEscorts = allEscorts.filter((e) => e.studentId === student.id);

        return NextResponse.json({
          success: true,
          match: {
            student,
            escort: escortMatch,
            authorizedEscorts: studentEscorts,
          },
        });
      }

      // Check by Admission Number or Student Name
      const { data: studentRows } = await sb
        .from('students')
        .select('id, admission_number, first_name, last_name, class_enrollments(classes:class_id(name))')
        .or(`admission_number.ilike.%${lookupQuery}%,first_name.ilike.%${lookupQuery}%,last_name.ilike.%${lookupQuery}%`)
        .limit(1);

      if (studentRows && studentRows.length > 0) {
        const s = studentRows[0];
        const student = {
          id: s.id,
          name: `${s.first_name} ${s.last_name}`.trim(),
          class: (s.class_enrollments as any)?.[0]?.classes?.name || 'Enrolled',
          admissionNo: s.admission_number,
        };

        const studentEscorts = allEscorts.filter((e) => e.studentId === s.id);
        const primaryEscort = studentEscorts[0] || null;

        return NextResponse.json({
          success: true,
          match: {
            student,
            escort: primaryEscort,
            authorizedEscorts: studentEscorts,
          },
        });
      }

      const attempt = await recordAuthAttempt({
        key: pinRateKey,
        scope: 'pickup_pin',
        success: false,
        targetLabel: lookupQuery,
        ipAddress: clientIp,
      });

      if (attempt.locked) {
        const waitMins = Math.max(1, Math.ceil(attempt.remainingSeconds / 60));
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSeconds: attempt.remainingSeconds,
            message: `Pickup PIN verification locked after 5 failed attempts. Principal alerted. Please wait ${waitMins} minute(s).`,
          },
          { status: 429 }
        );
      }

      return NextResponse.json({
        success: false,
        attemptsRemaining: Math.max(0, 5 - attempt.attempts),
        message: `No student or authorized escort found matching "${lookupQuery}".`,
      });
    }

    const scopedLogs = isParent ? formattedLogs.filter((l: any) => linkedIds.includes(l.studentId)) : formattedLogs;
    const scopedEscorts = isParent ? allEscorts.filter((e: any) => linkedIds.includes(e.studentId)) : allEscorts;

    return NextResponse.json({
      success: true,
      logs: scopedLogs,
      escorts: scopedEscorts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to load pickup records' },
      { status: 500 }
    );
  }
}

// POST /api/pickup - Verify and clear, flag, or register authorized escort
export async function POST(req: NextRequest) {
  try {
    const caller = await getCaller();
    const sb = getAdminClient();
    const body = await req.json();
    const { action } = body;

    if (caller.role === 'parent') {
      const linkedIds = await getLinkedStudentIds(caller.email);
      if (action !== 'register_escort' || !linkedIds.includes(body.studentId)) {
        return NextResponse.json(
          { success: false, message: 'Guardians may only register escorts for their own children.' },
          { status: 403 }
        );
      }
    }

    if (action === 'verify') {
      const {
        studentId,
        studentName,
        studentClass,
        pickedUpByName,
        relationship,
        verifiedByName = 'Gate Security',
        verificationMethod = 'qr_scan',
        notes = 'Pass verified. Student released.',
      } = body;

      if (!studentId || !UUID_RE.test(String(studentId)) || !pickedUpByName?.trim()) {
        return NextResponse.json(
          { success: false, message: 'A valid student and escort name are required.' },
          { status: 400 }
        );
      }

      const { data: studentRow } = await sb.from('students').select('id').eq('id', studentId).maybeSingle();
      if (!studentRow) {
        return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 });
      }

      const clientIp = extractClientIp(req);
      const verifyRateKey = `pickup_pin:${studentId}`;
      const preCheck = await checkAuthRateLimit(verifyRateKey);
      if (preCheck.locked) {
        const waitMins = Math.max(1, Math.ceil(preCheck.remainingSeconds / 60));
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSeconds: preCheck.remainingSeconds,
            message: `Dismissal verification locked for ${studentName || 'student'} after 5 failed attempts. Principal alerted. Please wait ${waitMins} minute(s).`,
          },
          { status: 429 }
        );
      }

      if (!(await isAuthorizedEscort(sb, studentId, pickedUpByName))) {
        const attempt = await recordAuthAttempt({
          key: verifyRateKey,
          scope: 'pickup_pin',
          success: false,
          targetLabel: `${studentName || studentId} (${pickedUpByName})`,
          ipAddress: clientIp,
        });
        if (attempt.locked) {
          return NextResponse.json(
            {
              success: false,
              locked: true,
              remainingSeconds: attempt.remainingSeconds,
              message: `Dismissal verification locked for ${studentName || 'student'} after 5 failed attempts. Principal alerted.`,
            },
            { status: 429 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            attemptsRemaining: Math.max(0, 5 - attempt.attempts),
            message: 'This person is not an authorized escort for the student.',
          },
          { status: 403 }
        );
      }

      await recordAuthAttempt({
        key: verifyRateKey,
        scope: 'pickup_pin',
        success: true,
        targetLabel: `${studentName || studentId}`,
        ipAddress: clientIp,
      });

      const { data, error } = await sb
        .from('pickup_logs')
        .insert({
          student_id: studentId,
          student_name: studentName,
          student_class: studentClass,
          picked_up_by_name: pickedUpByName,
          relationship: relationship,
          verified_by_name: verifiedByName,
          verification_method: verificationMethod,
          status: 'cleared',
          notes: notes,
          pickup_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (isUniqueViolation(error)) {
          return NextResponse.json(
            { success: false, message: `${studentName} has already been cleared for dismissal today.` },
            { status: 409 }
          );
        }
        throw error;
      }

      // Cross-portal dispatch: Notify guardian of cleared departure
      try {
        const { data: sgRows } = await sb
          .from('student_guardians')
          .select('guardians(email, first_name, last_name)')
          .eq('student_id', studentId)
          .eq('is_primary', true);
        const guardianEmail = (sgRows?.[0]?.guardians as any)?.email;
        if (guardianEmail) {
          await sb.from('notifications').insert({
            school_id: 'a0000000-0000-0000-0000-000000000001',
            recipient_email: guardianEmail.toLowerCase(),
            recipient_name: (sgRows?.[0]?.guardians as any)?.first_name || 'Guardian',
            subject: 'Student Dismissal Clearance',
            content_html: `${studentName} was cleared for gate dismissal with authorized escort ${pickedUpByName} (${relationship}).`,
            notification_type: 'pickup',
            status: 'sent',
            attempts_count: 0,
            idempotency_key: `notif-pickup-clear-${studentId}-${Date.now()}`,
          });
        }
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Departure logged and cleared for ${studentName}`,
        log: {
          id: data.id,
          studentId: data.student_id,
          studentName: data.student_name,
          studentClass: data.student_class,
          pickedUpByName: data.picked_up_by_name,
          relationship: data.relationship,
          verifiedByName: data.verified_by_name,
          verificationMethod: data.verification_method,
          status: data.status,
          notes: data.notes,
          pickupTime: data.pickup_time,
        },
      });
    }

    if (action === 'flag') {
      const {
        studentId,
        studentName,
        studentClass,
        pickedUpByName,
        relationship,
        verifiedByName = 'Gate Security',
        reason = 'Security question raised at gate dismissal.',
      } = body;

      const { data, error } = await sb
        .from('pickup_logs')
        .insert({
          student_id: studentId,
          student_name: studentName,
          student_class: studentClass,
          picked_up_by_name: pickedUpByName,
          relationship: relationship,
          verified_by_name: verifiedByName,
          verification_method: 'manual_code',
          status: 'flagged_unauthorized',
          notes: `Security Alert: ${reason}`,
          pickup_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Cross-portal dispatch: Urgent alert to Principal and Admin
      try {
        await sb.from('notifications').insert({
          school_id: 'a0000000-0000-0000-0000-000000000001',
          recipient_email: 'seyibankole@gmail.com',
          recipient_name: 'Mr Seyi Bankole (Principal)',
          subject: 'Urgent: Flagged Dismissal Alert',
          content_html: `Security Flag: Unauthorized or suspicious dismissal attempt for ${studentName} (${studentClass}). Escort presented: ${pickedUpByName || 'Unknown'}. Reason: ${reason}`,
          notification_type: 'broadcast',
          status: 'sent',
          attempts_count: 0,
          idempotency_key: `notif-pickup-flag-${studentId}-${Date.now()}`,
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Security incident flagged for ${studentName}`,
        log: {
          id: data.id,
          studentId: data.student_id,
          studentName: data.student_name,
          studentClass: data.student_class,
          pickedUpByName: data.picked_up_by_name,
          relationship: data.relationship,
          verifiedByName: data.verified_by_name,
          verificationMethod: data.verification_method,
          status: data.status,
          notes: data.notes,
          pickupTime: data.pickup_time,
        },
      });
    }

    if (action === 'register_escort') {
      const { studentId, fullName, relationship, phone } = body;

      if (!studentId || !fullName || !phone) {
        return NextResponse.json(
          { success: false, message: 'Missing required escort details' },
          { status: 400 }
        );
      }

      // Generate 4-digit pickup PIN and QR token
      // Generate a 4-digit PIN that no existing escort or guardian already holds
      const { data: usedTokens } = await sb.from('authorized_pickup_persons').select('qr_token');
      const { data: usedGuardianPins } = await sb.from('student_guardians').select('pickup_pin');
      const taken = new Set<string>([
        ...(usedTokens || []).map((t: any) => String(t.qr_token || '').replace(/\D/g, '').slice(-4)),
        ...(usedGuardianPins || []).map((g: any) => String(g.pickup_pin || '')),
      ]);
      let randomPin = '';
      for (let i = 0; i < 200; i++) {
        const candidate = Math.floor(1000 + Math.random() * 9000).toString();
        if (!taken.has(candidate)) {
          randomPin = candidate;
          break;
        }
      }
      if (!randomPin) {
        return NextResponse.json(
          { success: false, message: 'No free pickup PIN is available.' },
          { status: 500 }
        );
      }
      const qrToken = `OAK-PK-${randomPin}`;

      const { data, error } = await sb
        .from('authorized_pickup_persons')
        .insert({
          student_id: studentId,
          full_name: fullName.trim(),
          relationship: relationship || 'Relative',
          phone: phone.trim(),
          qr_token: qrToken,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: `Authorized escort ${fullName} registered with 4-digit PIN ${randomPin}`,
        escort: {
          id: data.id,
          studentId: data.student_id,
          fullName: data.full_name,
          relationship: data.relationship,
          phone: data.phone,
          qrToken: data.qr_token,
          pickupPin: randomPin,
          isActive: data.is_active,
        },
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Pickup operation failed' },
      { status: 500 }
    );
  }
}
