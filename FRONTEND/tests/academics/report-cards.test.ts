import { describe, expect, it } from 'vitest';
import { buildClassReportCards, type ClassStudent } from '@/lib/report-cards';

const students: ClassStudent[] = [
  { id: 's1', enrollmentId: 'e1', admissionNo: 'A-1', name: 'Student One' },
  { id: 's2', enrollmentId: 'e2', admissionNo: 'A-2', name: 'Student Two' },
  { id: 's3', enrollmentId: 'e3', admissionNo: 'A-3', name: 'Student Three' },
  { id: 's4', enrollmentId: 'e4', admissionNo: 'A-4', name: 'Student Four' },
];

const locked = (scores: Record<string, unknown>[]) => ({ scores, isLocked: true, submittedBy: 'Teacher' });

const scores = {
  'JSS 1_Mathematics': locked([
    { id: 's1', ca1: 18, ca2: 17, exam: 55 }, // 90
    { id: 's2', ca1: 10, ca2: 10, exam: 40 }, // 60
    { admissionNo: 'A-3', ca1: 12, ca2: 12, exam: 46 }, // 70, matched by admission number
  ]),
  'JSS 1_English Language': locked([
    { id: 's1', ca1: 14, ca2: 16, exam: 50 }, // 80
    { id: 's2', ca1: 8, ca2: 9, exam: 33 }, // 50
  ]),
  'JSS 2_Mathematics': locked([{ id: 's1', ca1: 20, ca2: 20, exam: 60 }]),
};

describe('buildClassReportCards', () => {
  const result = buildClassReportCards('JSS 1', students, scores);
  const card = (id: string) => result.cards.find((c) => c.studentId === id);

  it('makes a card only for students who have locked scores', () => {
    expect(result.cards.map((c) => c.studentId).sort()).toEqual(['s1', 's2', 's3']);
    expect(card('s4')).toBeUndefined();
    expect(result.studentsWithoutScores).toBe(1);
  });

  it('uses only the class’s own subjects', () => {
    expect(card('s1')?.subjects.map((s) => s.name)).toEqual(['English Language', 'Mathematics']);
  });

  it('works out totals, grades and the average from the 20, 20, 60 marks', () => {
    const c = card('s1')!;
    expect(c.subjects.find((s) => s.name === 'Mathematics')).toMatchObject({ ca1: 18, ca2: 17, exam: 55, total: 90, grade: 'A+' });
    expect(c.subjects.find((s) => s.name === 'English Language')).toMatchObject({ total: 80, grade: 'A' });
    expect(c.totalScore).toBe(170);
    expect(c.averageScore).toBe(85);
  });

  it('ranks by average and leaves a student out of both subjects unranked', () => {
    expect(card('s1')?.rank).toBe(1);
    expect(card('s3')?.rank).toBe(2); // 70 average, taken one subject
    expect(card('s2')?.rank).toBe(3); // 55 average
  });

  it('matches by admission number when the id is missing, and never by name', () => {
    expect(card('s3')?.subjects).toHaveLength(1);
    const byName = buildClassReportCards('JSS 1', students, {
      'JSS 1_Mathematics': locked([{ name: 'Student One', ca1: 10, ca2: 10, exam: 10 }]),
    });
    expect(byName.cards).toEqual([]);
  });

  it('leaves out a subject that is not locked yet and says which', () => {
    const open = buildClassReportCards('JSS 1', students, {
      ...scores,
      'JSS 1_Basic Science': { scores: [{ id: 's1', ca1: 5, ca2: 5, exam: 5 }], isLocked: false },
    });
    expect(open.unlockedSubjects).toEqual(['Basic Science']);
    expect(open.cards.find((c) => c.studentId === 's1')?.subjects.map((s) => s.name)).not.toContain('Basic Science');
  });

  it('makes no cards, and invents no marks, when nothing is locked', () => {
    const none = buildClassReportCards('JSS 1', students, {
      'JSS 1_Mathematics': { scores: [{ id: 's1', ca1: 10, ca2: 10, exam: 40 }], isLocked: false },
    });
    expect(none.cards).toEqual([]);
    expect(none.studentsWithoutScores).toBe(4);
    expect(buildClassReportCards('JSS 1', students, null).cards).toEqual([]);
    expect(buildClassReportCards('JSS 1', students, undefined).studentsWithoutScores).toBe(4);
  });

  it('caps marks at 20, 20 and 60', () => {
    const capped = buildClassReportCards('JSS 1', students, { 'JSS 1_Mathematics': locked([{ id: 's1', ca1: 99, ca2: 99, exam: 99 }]) });
    expect(capped.cards[0].subjects[0]).toMatchObject({ ca1: 20, ca2: 20, exam: 60, total: 100 });
  });

  it('gives tied students the same rank', () => {
    const tied = buildClassReportCards('JSS 1', students, {
      'JSS 1_Mathematics': locked([
        { id: 's1', ca1: 10, ca2: 10, exam: 40 },
        { id: 's2', ca1: 10, ca2: 10, exam: 40 },
        { id: 's3', ca1: 5, ca2: 5, exam: 20 },
      ]),
    });
    const ranks = Object.fromEntries(tied.cards.map((c) => [c.studentId, c.rank]));
    expect(ranks.s1).toBe(1);
    expect(ranks.s2).toBe(1);
    expect(ranks.s3).toBeGreaterThan(1);
  });

  it('reads the older plain-array entries only when every row is locked', () => {
    const legacyLocked = buildClassReportCards('JSS 1', students, {
      'JSS 1_Mathematics': [{ id: 's1', ca1: 10, ca2: 10, exam: 40, isLocked: true }],
    });
    expect(legacyLocked.cards).toHaveLength(1);
    const legacyOpen = buildClassReportCards('JSS 1', students, {
      'JSS 1_Mathematics': [{ id: 's1', ca1: 10, ca2: 10, exam: 40 }],
    });
    expect(legacyOpen.cards).toEqual([]);
  });
});
