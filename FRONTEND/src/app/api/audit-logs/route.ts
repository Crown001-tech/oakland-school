import { NextResponse, type NextRequest } from 'next/server';
import { getCaller, formatRoleLabel } from '@/lib/caller';
import { getSchoolDb } from '@/lib/school-db';


export async function GET() {
  try {
    const sb = await getSchoolDb();

    const { data: logs, error } = await sb
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const formattedLogs = (logs || []).map((l: any) => {
      let actorRole: 'Proprietor' | 'Principal' | 'Bursar' | 'Dean' = 'Principal';
      if (l.actor_role?.toLowerCase().includes('proprietor')) actorRole = 'Proprietor';
      else if (l.actor_role?.toLowerCase().includes('bursar')) actorRole = 'Bursar';
      else if (l.actor_role?.toLowerCase().includes('dean')) actorRole = 'Dean';

      let category: 'Governance' | 'Finance' | 'Academic' | 'Staff' | 'Admissions' = 'Governance';
      const act = (l.action || '').toLowerCase();
      const resType = (l.resource_type || '').toLowerCase();

      if (act.includes('finance') || act.includes('payment') || act.includes('tuition') || resType.includes('finance')) {
        category = 'Finance';
      } else if (act.includes('timetable') || act.includes('result') || act.includes('grade') || resType.includes('timetable') || resType.includes('academic')) {
        category = 'Academic';
      } else if (act.includes('staff') || act.includes('teacher') || resType.includes('staff')) {
        category = 'Staff';
      } else if (act.includes('admission') || act.includes('student') || resType.includes('student')) {
        category = 'Admissions';
      }

      const actorName =
        l.actor_name ||
        l.metadata?.actorName ||
        l.metadata?.publishedBy ||
        actorRole;

      return {
        id: l.id,
        actorName,
        actorRole,
        action: l.action?.replace(/[._]/g, ' ')?.toUpperCase() || 'SYSTEM EVENT',
        details: l.metadata?.summary || l.metadata?.action || l.action || 'Recorded system audit event',
        category,
        timestamp: new Date(l.created_at).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    });

    return NextResponse.json({ success: true, data: formattedLogs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const caller = await getCaller();
    if (!caller.hasSession) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, resource_type, resource_id, metadata, actor_name, actor_role } = body;

    if (!action) {
      return NextResponse.json({ success: false, message: 'Action required' }, { status: 400 });
    }

    const sb = await getSchoolDb();
    const resolvedRole = actor_role || formatRoleLabel(caller.role);
    const resolvedName = actor_name || caller.email || resolvedRole;

    const { data: newLog, error } = await sb
      .from('audit_logs')
      .insert({
        school_id: sb.schoolId,
        actor_id: caller.userId,
        actor_name: resolvedName,
        actor_role: resolvedRole,
        action: String(action).trim(),
        resource_type: resource_type ? String(resource_type).trim() : 'system',
        resource_id: resource_id ? String(resource_id).trim() : null,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Failed to save audit log' },
      { status: 500 }
    );
  }
}
