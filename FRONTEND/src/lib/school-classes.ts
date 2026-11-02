import type { SchoolDb } from '@/lib/school-scope';

/**
 * A school's classes, in teaching order (lowest level first), read from its `classes` table.
 * Class names are never hardcoded: a school with JSS 1 to SS 3, Primary 1 to 6, or Year 7 to 13 gets its own.
 */
export async function getClassNames(sb: Pick<SchoolDb, 'from'>, schoolId?: string): Promise<string[]> {
  let query = sb.from('classes').select('name, grade_level').order('grade_level', { ascending: true }).order('name', { ascending: true });
  if (schoolId) query = query.eq('school_id', schoolId);
  const { data } = await query;
  return (data || []).map((c: { name: string }) => c.name).filter(Boolean);
}
