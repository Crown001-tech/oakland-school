import { computeClassRankings, computeSubjectGrade } from '@/lib/grading';
import { STARTER_GRADING_CONFIG, type GradingConfig } from '@/lib/grading-config';

/**
 * Builds a class's report cards from the scores teachers have locked. Pure, so it can be tested
 * without a database. Zero-placeholder rule: a student with no locked scores gets no card, and a
 * subject nobody has locked is left off every card.
 */

export interface ClassStudent {
  id: string;
  enrollmentId: string;
  admissionNo: string;
  name: string;
}

export interface CardSubject {
  name: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

export interface BuiltCard {
  studentId: string;
  enrollmentId: string;
  subjects: CardSubject[];
  totalScore: number;
  averageScore: number;
  /** 1 for the top student; ties share a rank. */
  rank: number;
}

export interface BuildResult {
  cards: BuiltCard[];
  /** Students in the class with no locked scores, so no card. */
  studentsWithoutScores: number;
  /** Subjects that have scores entered but are not locked yet, so they are left off the cards. */
  unlockedSubjects: string[];
}

interface RawEntry {
  id?: string;
  admissionNo?: string;
  ca1?: unknown;
  ca2?: unknown;
  exam?: unknown;
  isLocked?: boolean;
}

const num = (value: unknown): number | null => (typeof value === 'number' && !isNaN(value) ? value : null);

/** A settings entry is either the current `{ scores, isLocked }` object or an older plain array. */
function unpack(entry: unknown): { scores: RawEntry[]; locked: boolean } {
  if (Array.isArray(entry)) {
    const scores = entry as RawEntry[];
    return { scores, locked: scores.length > 0 && scores.every((s) => s?.isLocked === true) };
  }
  const e = (entry || {}) as { scores?: RawEntry[]; isLocked?: boolean };
  return { scores: Array.isArray(e.scores) ? e.scores : [], locked: Boolean(e.isLocked) };
}

export function buildClassReportCards(
  className: string,
  students: ClassStudent[],
  subjectScores: Record<string, unknown> | null | undefined,
  config: GradingConfig = STARTER_GRADING_CONFIG
): BuildResult {
  const prefix = `${className}_`;
  const unlockedSubjects: string[] = [];
  const lockedSubjects: { name: string; scores: RawEntry[] }[] = [];

  for (const [key, entry] of Object.entries(subjectScores || {})) {
    if (!key.startsWith(prefix)) continue;
    const name = key.slice(prefix.length);
    const { scores, locked } = unpack(entry);
    const hasAnyScore = scores.some((s) => computeSubjectGrade({ ca1: num(s?.ca1), ca2: num(s?.ca2), exam: num(s?.exam) }, config).hasScores);
    if (!hasAnyScore) continue;
    if (locked) lockedSubjects.push({ name, scores });
    else unlockedSubjects.push(name);
  }
  lockedSubjects.sort((a, b) => a.name.localeCompare(b.name));
  unlockedSubjects.sort();

  // A student's marks match by id or admission number only, never by name
  const entryFor = (scores: RawEntry[], student: ClassStudent) =>
    scores.find((s) => (s?.id && s.id === student.id) || (s?.admissionNo && s.admissionNo === student.admissionNo));

  const withSubjects = students.map((student) => {
    const subjects: CardSubject[] = [];
    for (const { name, scores } of lockedSubjects) {
      const entry = entryFor(scores, student);
      if (!entry) continue;
      const graded = computeSubjectGrade({ ca1: num(entry.ca1), ca2: num(entry.ca2), exam: num(entry.exam) }, config);
      if (!graded.hasScores || graded.total === null) continue;
      subjects.push({
        name,
        ca1: Math.min(config.ca1Max, Math.max(0, num(entry.ca1) ?? 0)),
        ca2: Math.min(config.ca2Max, Math.max(0, num(entry.ca2) ?? 0)),
        exam: Math.min(config.examMax, Math.max(0, num(entry.exam) ?? 0)),
        total: graded.total,
        grade: graded.grade,
        remark: graded.remark,
      });
    }
    return { student, subjects };
  });

  const rankings = computeClassRankings(
    withSubjects.map(({ student, subjects }) => ({
      id: student.id,
      scores: subjects.map((s) => ({ ca1: s.ca1, ca2: s.ca2, exam: s.exam })),
    })),
    config
  );

  const cards: BuiltCard[] = [];
  for (const { student, subjects } of withSubjects) {
    if (subjects.length === 0) continue;
    const ranking = rankings.get(student.id);
    if (!ranking || ranking.average === null) continue;
    cards.push({
      studentId: student.id,
      enrollmentId: student.enrollmentId,
      subjects,
      totalScore: Math.round(subjects.reduce((sum, s) => sum + s.total, 0) * 10) / 10,
      averageScore: ranking.average,
      rank: ranking.rank,
    });
  }

  return { cards, studentsWithoutScores: students.length - cards.length, unlockedSubjects };
}

// ---------------------------------------------------------------------------------------------
// Qualitative report cards and skill and behaviour ratings
//
// Nursery and primary report cards often carry a teacher's remark for each subject instead of marks, and a
// set of skill and behaviour ratings (punctuality, neatness, handwriting, games). Secondary report cards
// can carry the ratings too. Nothing here invents a remark or a rating: a card exists only for a student the
// teacher wrote something for, and a rating is the teacher's whole number from the school's scale.
// ---------------------------------------------------------------------------------------------

export type ReportStyle = 'scored' | 'descriptive';

export const TRAIT_GROUPS = ['skill', 'behaviour'] as const;
export type TraitGroup = (typeof TRAIT_GROUPS)[number];

/** A rating runs from TRAIT_SCALE.min (needs help) to TRAIT_SCALE.max (excellent). */
export const TRAIT_SCALE = { min: 1, max: 5 } as const;

export interface Trait {
  name: string;
  group: TraitGroup;
  rating: number;
}

export interface DescriptiveSubject {
  name: string;
  remark: string;
}

export interface BuiltDescriptiveCard {
  studentId: string;
  enrollmentId: string;
  subjects: DescriptiveSubject[];
  traits: Trait[];
  comment: string | null;
}

export interface DescriptiveInput {
  subjects?: unknown;
  traits?: unknown;
  comment?: unknown;
}

const MAX_REMARK = 500;
const MAX_TRAITS = 30;

/** Validates a list of ratings from a teacher. Returns the clean list, or why it was refused. */
export function cleanTraits(input: unknown): { traits: Trait[]; error?: string } {
  if (input === undefined || input === null) return { traits: [] };
  if (!Array.isArray(input)) return { traits: [], error: 'Ratings must be a list.' };
  if (input.length > MAX_TRAITS) return { traits: [], error: `At most ${MAX_TRAITS} ratings are allowed on a card.` };
  const seen = new Set<string>();
  const traits: Trait[] = [];
  for (const raw of input) {
    const t = (raw || {}) as { name?: unknown; group?: unknown; rating?: unknown };
    const name = typeof t.name === 'string' ? t.name.trim() : '';
    if (!name || name.length > 60) return { traits: [], error: 'Each rating needs a name of up to 60 letters.' };
    if (!TRAIT_GROUPS.includes(t.group as TraitGroup)) return { traits: [], error: `"${name}" must be a skill or a behaviour.` };
    const rating = t.rating;
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < TRAIT_SCALE.min || rating > TRAIT_SCALE.max) {
      return { traits: [], error: `The rating for "${name}" must be a whole number from ${TRAIT_SCALE.min} to ${TRAIT_SCALE.max}.` };
    }
    const key = `${t.group}:${name.toLowerCase()}`;
    if (seen.has(key)) return { traits: [], error: `"${name}" is rated twice.` };
    seen.add(key);
    traits.push({ name, group: t.group as TraitGroup, rating });
  }
  return { traits };
}

/**
 * Builds a class's descriptive cards from what the class teacher wrote. A student with no remark and no rating
 * gets no card. A remark must be for a subject the school has registered, and a student must be in the class.
 */
export function buildDescriptiveCards(
  students: ClassStudent[],
  input: Record<string, DescriptiveInput> | null | undefined,
  registeredSubjects: string[]
): { cards: BuiltDescriptiveCard[]; errors: string[] } {
  const errors: string[] = [];
  const cards: BuiltDescriptiveCard[] = [];
  const byId = new Map(students.map((s) => [s.id, s]));
  const subjectKey = (s: string) => s.trim().toLowerCase();
  const registered = new Map(registeredSubjects.map((s) => [subjectKey(s), s]));

  for (const [studentId, entry] of Object.entries(input || {})) {
    const student = byId.get(studentId);
    if (!student) {
      errors.push('A student in the list is not in this class.');
      continue;
    }

    const subjects: DescriptiveSubject[] = [];
    let bad = false;
    for (const raw of Array.isArray(entry?.subjects) ? (entry.subjects as unknown[]) : []) {
      const r = (raw || {}) as { name?: unknown; remark?: unknown };
      const remark = typeof r.remark === 'string' ? r.remark.trim() : '';
      if (!remark) continue; // a subject with no remark is simply left off
      const name = registered.get(subjectKey(typeof r.name === 'string' ? r.name : ''));
      if (!name) {
        errors.push(`${student.name}: "${String(r.name ?? '')}" is not a registered subject.`);
        bad = true;
        continue;
      }
      if (remark.length > MAX_REMARK) {
        errors.push(`${student.name}: the remark for ${name} is longer than ${MAX_REMARK} letters.`);
        bad = true;
        continue;
      }
      subjects.push({ name, remark });
    }

    const { traits, error } = cleanTraits(entry?.traits);
    if (error) {
      errors.push(`${student.name}: ${error}`);
      bad = true;
    }
    const comment = typeof entry?.comment === 'string' && entry.comment.trim() ? entry.comment.trim().slice(0, 1000) : null;

    if (bad || (subjects.length === 0 && traits.length === 0 && !comment)) continue;
    cards.push({ studentId, enrollmentId: student.enrollmentId, subjects, traits, comment });
  }

  return { cards, errors };
}
