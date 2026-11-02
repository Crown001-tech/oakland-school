import { NextResponse, type NextRequest } from 'next/server';
import { tuitionGroup } from '@/lib/tuition';
import { buildClassName, insertLevel, splitClassName } from '@/lib/class-levels';
import { getSchoolDb } from '@/lib/school-db';


interface Incoming {
  /** The full class name, typed by the school. Used when no level is given. */
  name?: unknown;
  level?: unknown;
  arm?: unknown;
  capacity?: unknown;
  tuition?: unknown;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Adds classes, from the Add Class form or an import. A class is a level plus an arm (JSS 1 Diamond is level
 * JSS 1, arm Diamond), or a full name typed by the school. Classes are kept in teaching order by level, with
 * the arms of a level together.
 *
 * A class with no capacity of its own takes the school's class capacity setting, and has none if the school
 * has not set one (nothing is invented). A class that already exists is left alone.
 *
 * Tuition belongs to the level, so every arm of a level is billed the same. A level outside JSS and SS
 * (Nursery 1, Primary 3) bills from its own fee structure, so a tuition amount given here is saved against
 * the level, unless the level already has one. JSS and SS levels bill from School Settings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const list: Incoming[] = Array.isArray(body?.classes) ? body.classes : [];
    if (list.length === 0) {
      return NextResponse.json({ success: false, message: 'No classes to add.' }, { status: 400 });
    }

    const sb = await getSchoolDb();
    const [{ data: existing }, { data: school }, { data: feeRows }] = await Promise.all([
      sb.from('classes').select('id, name, level, grade_level').eq('school_id', sb.schoolId).order('grade_level', { ascending: true }),
      sb.from('schools').select('settings').eq('id', sb.schoolId).maybeSingle(),
      sb.from('fee_structures').select('class_name').eq('school_id', sb.schoolId),
    ]);

    const have = new Set((existing || []).map((c: { name: string }) => c.name.trim().toLowerCase()));
    const haveFee = new Set((feeRows || []).map((f: { class_name: string }) => f.class_name.trim().toLowerCase()));
    const settingCapacity = Number((school?.settings as Record<string, unknown> | null)?.classCapacity);

    // The school's levels in teaching order
    let levels: string[] = [];
    for (const c of existing || []) {
      const l = (c.level || c.name).trim();
      if (!levels.some((x) => x.toLowerCase() === l.toLowerCase())) levels.push(l);
    }

    const rows: { name: string; level: string; arm: string | null; capacity: number | null }[] = [];
    const fees: { level: string; amount: number }[] = [];
    for (const item of list) {
      let level = text(item.level);
      let arm = text(item.arm);
      let name: string;
      if (level) {
        name = buildClassName(level, arm);
      } else {
        name = text(item.name);
        if (!name) continue;
        ({ level, arm } = splitClassName(name));
      }
      if (!name || have.has(name.toLowerCase())) continue;
      have.add(name.toLowerCase());

      // Keep the spelling the school already uses for this level
      level = levels.find((l) => l.toLowerCase() === level.toLowerCase()) ?? level;
      levels = insertLevel(levels, level);

      const own = Number(item.capacity);
      const capacity = Number.isInteger(own) && own > 0 ? own : Number.isInteger(settingCapacity) && settingCapacity > 0 ? settingCapacity : null;
      rows.push({ name, level, arm: arm || null, capacity });

      const fee = Number(item.tuition);
      if (Number.isFinite(fee) && fee > 0 && tuitionGroup(level) === null && !haveFee.has(level.toLowerCase()) && !fees.some((f) => f.level.toLowerCase() === level.toLowerCase())) {
        fees.push({ level, amount: fee });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'Those classes already exist.' });
    }

    const rank = (level: string) => levels.findIndex((l) => l.toLowerCase() === level.toLowerCase()) + 1;

    const { error } = await sb.from('classes').insert(
      rows.map((r) => ({ school_id: sb.schoolId, name: r.name, level: r.level, arm: r.arm, capacity: r.capacity, grade_level: rank(r.level) }))
    );
    if (error) throw error;

    // Bring the existing classes into the new order
    for (const c of existing || []) {
      const want = rank((c.level || c.name).trim());
      if (want > 0 && want !== c.grade_level) {
        await sb.from('classes').update({ grade_level: want }).eq('id', c.id);
      }
    }

    if (fees.length > 0) {
      const [{ data: session }, { data: term }] = await Promise.all([
        sb.from('academic_sessions').select('name').eq('is_current', true).maybeSingle(),
        sb.from('academic_terms').select('name').eq('is_current', true).maybeSingle(),
      ]);
      // Every other levy is set to 0: the table's own defaults are not this school's amounts
      const { error: feeError } = await sb.from('fee_structures').insert(
        fees.map((f) => ({
          school_id: sb.schoolId,
          class_name: f.level,
          term: term?.name || 'Current Term',
          academic_year: session?.name || 'Current Session',
          tuition_fee: f.amount,
          development_levy: 0,
          books_stationery: 0,
          uniform_sports: 0,
          ict_science_levy: 0,
          pta_levy: 0,
          total_amount: f.amount,
        }))
      );
      if (feeError) throw feeError;
    }
    return NextResponse.json({ success: true, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Could not add classes.' }, { status: 500 });
  }
}
