import { computeClassRankings, computeSubjectGrade } from '@/lib/grading';

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
  subjectScores: Record<string, unknown> | null | undefined
): BuildResult {
  const prefix = `${className}_`;
  const unlockedSubjects: string[] = [];
  const lockedSubjects: { name: string; scores: RawEntry[] }[] = [];

  for (const [key, entry] of Object.entries(subjectScores || {})) {
    if (!key.startsWith(prefix)) continue;
    const name = key.slice(prefix.length);
    const { scores, locked } = unpack(entry);
    const hasAnyScore = scores.some((s) => computeSubjectGrade({ ca1: num(s?.ca1), ca2: num(s?.ca2), exam: num(s?.exam) }).hasScores);
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
      const graded = computeSubjectGrade({ ca1: num(entry.ca1), ca2: num(entry.ca2), exam: num(entry.exam) });
      if (!graded.hasScores || graded.total === null) continue;
      subjects.push({
        name,
        ca1: Math.min(20, Math.max(0, num(entry.ca1) ?? 0)),
        ca2: Math.min(20, Math.max(0, num(entry.ca2) ?? 0)),
        exam: Math.min(60, Math.max(0, num(entry.exam) ?? 0)),
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
    }))
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
