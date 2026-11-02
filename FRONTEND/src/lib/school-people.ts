import type { SchoolDb } from '@/lib/school-scope';

/**
 * The principal's name from the school's own staff records. Used wherever the system writes a name on a
 * notice or an escalation, so it is never a fixed person. Falls back to the plain title, never a name.
 */
export async function getPrincipalName(sb: Pick<SchoolDb, 'from'>, schoolId?: string): Promise<string> {
  let query = sb.from('staff_profiles').select('first_name, last_name').in('role', ['admin', 'principal']).eq('is_active', true).order('created_at', { ascending: true }).limit(1);
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data } = await query;
  const person = data?.[0];
  const name = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : '';
  return name || 'the Principal';
}

/** The principal's name and email from staff records. The email is null when none is on file. */
export async function getPrincipalContact(sb: Pick<SchoolDb, 'from'>, schoolId?: string): Promise<{ name: string; email: string | null }> {
  let query = sb.from('staff_profiles').select('first_name, last_name, email').in('role', ['admin', 'principal']).eq('is_active', true).order('created_at', { ascending: true }).limit(1);
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data } = await query;
  const person = data?.[0];
  const name = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : '';
  return { name: name || 'the Principal', email: person?.email || null };
}
