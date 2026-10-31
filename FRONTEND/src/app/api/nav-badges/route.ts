import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

function getAdminClient() {
  return getSupabaseAdmin();
}

export interface NavBadgeItem {
  count: number;
  dot: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedRole = searchParams.get('role')?.toLowerCase() || 'proprietor';
    const sb = getAdminClient();

    // Parallel fetch of real database entities
    const [admRes, staffRes, leaveRes, pickupRes, schoolRes, rcRes] = await Promise.all([
      sb.from('admission_applications').select('id, status'),
      sb.from('staff_applications').select('id, status'),
      sb.from('workflow_instances').select('id, status').eq('entity_type', 'leave_request'),
      sb.from('pickup_logs').select('id, status'),
      sb.from('schools').select('settings').limit(1).maybeSingle(),
      sb.from('report_cards').select('id, enrollment_id'),
    ]);

    // 1. Pending Admissions (Public student admissions requiring executive review)
    const pendingAdmissions = (admRes.data || []).filter(
      (a: any) => !['accepted', 'enrolled', 'rejected', 'declined'].includes((a.status || '').toLowerCase())
    ).length;

    // 2. Pending Staff Approvals (Teacher/Admin/Bursar applications awaiting appointment)
    const pendingStaff = (staffRes.data || []).filter(
      (s: any) => !['approved', 'rejected', 'declined'].includes((s.status || '').toLowerCase())
    ).length;

    // 3. Pending Leave Requests (Staff leave applications awaiting Principal sign-off)
    const pendingLeaves = (leaveRes.data || []).filter(
      (l: any) => ['pending', 'submitted', 'in_progress'].includes((l.status || '').toLowerCase())
    ).length;

    // 4. Pending Gate Pickups (Escorts actively waiting at security gate)
    const pendingPickups = (pickupRes.data || []).filter(
      (p: any) => ['waiting', 'pending'].includes((p.status || '').toLowerCase())
    ).length;

    // 5. Results Pending Sign-off
    const schoolSettings = schoolRes.data?.settings || {};
    const endorsedClasses: string[] = schoolSettings.endorsed_results || [];
    let pendingResultsCount = 0;
    if (rcRes.data && rcRes.data.length > 0) {
      // If there are report cards, check which classes they belong to that are not yet endorsed
      // For now, if report cards exist and not endorsed, count classes
      const { data: dbClasses } = await sb.from('classes').select('id, name');
      const { data: enrollments } = await sb.from('class_enrollments').select('id, class_id').eq('status', 'active');
      const enrollmentClassMap = new Map((enrollments || []).map((e: any) => [e.id, e.class_id]));
      const classIdMap = new Map((dbClasses || []).map((c: any) => [c.id, c.name]));
      
      const classCardCount = new Set<string>();
      (rcRes.data || []).forEach((rc: any) => {
        const cId = enrollmentClassMap.get(rc.enrollment_id);
        if (cId) {
          const cName = classIdMap.get(cId);
          if (cName && !endorsedClasses.includes(cName)) {
            classCardCount.add(cName);
          }
        }
      });
      pendingResultsCount = classCardCount.size;
    }

    // Map badges cleanly by destination route href
    const badges: Record<string, NavBadgeItem> = {
      // Proprietor Portal
      '/proprietor/admissions': { count: pendingAdmissions, dot: false },
      '/proprietor/staff-approvals': { count: pendingStaff, dot: false },
      '/proprietor/results': { count: pendingResultsCount, dot: false },

      // Admin / Principal Portal
      '/admin/admissions': { count: pendingAdmissions, dot: false },
      '/admin/leave': { count: pendingLeaves, dot: false },
      '/admin/results': { count: pendingResultsCount, dot: false },
      '/admin/pickup': { count: pendingPickups, dot: false },

      // Security Portal
      '/security/pickup': { count: pendingPickups, dot: false },

      // Bursar Portal
      '/bursar/fees': { count: 0, dot: false },

      // Teacher Portal
      '/teacher/report-cards': { count: pendingResultsCount > 0 ? pendingResultsCount : 0, dot: false },

      // Parent Portal
      '/parent/results': { count: 0, dot: false },
    };

    return NextResponse.json({
      success: true,
      role: requestedRole,
      badges,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Database error', badges: {} },
      { status: 500 }
    );
  }
}
