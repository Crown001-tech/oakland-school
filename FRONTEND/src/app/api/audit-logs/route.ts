import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gxkywfgoitfjyuipkmqj.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const sb = getAdminClient();

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

      const actorName = l.metadata?.publishedBy || l.metadata?.actorName || (actorRole === 'Proprietor' ? 'Office of the Proprietor' : 'Mr Seyi Bankole');

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
