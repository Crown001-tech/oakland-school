/**
 * A class is a level plus an arm: "JSS 1 Diamond" is level "JSS 1", arm "Diamond". Schools split a level
 * into arms (A, B, a colour or a gem name). What differs between arms is the timetable, the class teacher
 * and the capacity; the tuition belongs to the level.
 *
 * The ladder below is only the list of levels a Nigerian school usually runs, used to offer choices and to
 * keep classes in teaching order. A school can type any level or any full class name instead.
 */
export const LEVEL_LADDER = [
  'Creche',
  'Nursery 1',
  'Nursery 2',
  'Nursery 3',
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'JSS 1',
  'JSS 2',
  'JSS 3',
  'SS 1',
  'SS 2',
  'SS 3',
] as const;

/** Arms offered in the form; a school can type its own. */
export const ARM_SUGGESTIONS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const key = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, '');

/** The ladder level a name starts with, ignoring case and spacing ("jss1" is "JSS 1"). */
function ladderLevelOf(name: string): string | null {
  const compact = key(name);
  let best: string | null = null;
  for (const level of LEVEL_LADDER) {
    const k = key(level);
    if (!compact.startsWith(k)) continue;
    // "Primary 1" must not claim "Primary 10", and "SS 1" must not claim "SS 12"
    const next = compact[k.length];
    if (next !== undefined && /[0-9]/.test(next) && /[0-9]$/.test(k)) continue;
    if (!best || k.length > key(best).length) best = level;
  }
  return best;
}

export function buildClassName(level: string, arm?: string | null): string {
  const l = level.trim();
  const a = (arm ?? '').trim();
  return a ? `${l} ${a}` : l;
}

/** Splits a full class name into level and arm when it starts with a known level; otherwise the name is the level. */
export function splitClassName(name: string): { level: string; arm: string } {
  const trimmed = name.trim();
  const level = ladderLevelOf(trimmed);
  if (!level) return { level: trimmed, arm: '' };
  // Walk the original text to find where the level ends, so the arm keeps its own spelling
  const k = key(level);
  let seen = '';
  let i = 0;
  while (i < trimmed.length && seen.length < k.length) {
    if (!/[\s._-]/.test(trimmed[i])) seen += trimmed[i].toLowerCase();
    i++;
  }
  return { level, arm: trimmed.slice(i).replace(/^[\s._-]+/, '').trim() };
}

/**
 * Puts a new level among the school's existing levels in teaching order. A ladder level goes before the
 * first existing ladder level that comes after it; any other level goes last.
 */
export function insertLevel(existingLevels: string[], added: string): string[] {
  if (existingLevels.some((l) => key(l) === key(added))) return existingLevels;
  const rank = (l: string) => LEVEL_LADDER.findIndex((x) => key(x) === key(l));
  const addedRank = rank(added);
  if (addedRank === -1) return [...existingLevels, added];
  const at = existingLevels.findIndex((l) => rank(l) > addedRank);
  if (at === -1) return [...existingLevels, added];
  return [...existingLevels.slice(0, at), added, ...existingLevels.slice(at)];
}
