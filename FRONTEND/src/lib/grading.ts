/**
 * Oakland International School - Academic Grading and Broadsheet Evaluation
 * Strict Zero Placeholder Invariant: Returns null and 'Scores Pending' when marks are missing.
 */

export interface SubjectScoreInput {
  ca1?: number | null;
  ca2?: number | null;
  exam?: number | null;
}

export interface GradeResult {
  total: number | null;
  grade: string;
  points: number;
  remark: string;
  hasScores: boolean;
  color: string;
}

export function calculateGrade(total: number): { grade: string; points: number; remark: string; color: string } {
  if (total >= 90) return { grade: 'A+', points: 4.0, remark: 'Distinction', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (total >= 80) return { grade: 'A', points: 4.0, remark: 'Excellent', color: 'text-teal-700 bg-teal-50 border-teal-200' };
  if (total >= 70) return { grade: 'B', points: 3.0, remark: 'Very Good', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  if (total >= 60) return { grade: 'C', points: 2.0, remark: 'Good Credit', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
  if (total >= 50) return { grade: 'D', points: 1.0, remark: 'Pass', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { grade: 'F', points: 0.0, remark: 'Fail', color: 'text-rose-700 bg-rose-50 border-rose-200' };
}

export function computeSubjectGrade(score: SubjectScoreInput): GradeResult {
  const hasCa1 = typeof score.ca1 === 'number' && !isNaN(score.ca1);
  const hasCa2 = typeof score.ca2 === 'number' && !isNaN(score.ca2);
  const hasExam = typeof score.exam === 'number' && !isNaN(score.exam);

  if (!hasCa1 && !hasCa2 && !hasExam) {
    return {
      total: null,
      grade: '—',
      points: 0.0,
      remark: 'Scores Pending',
      hasScores: false,
      color: 'text-slate-400 bg-slate-50 border-slate-200',
    };
  }

  const c1 = hasCa1 ? Math.min(20, Math.max(0, score.ca1!)) : 0;
  const c2 = hasCa2 ? Math.min(20, Math.max(0, score.ca2!)) : 0;
  const ex = hasExam ? Math.min(60, Math.max(0, score.exam!)) : 0;
  const total = Math.round((c1 + c2 + ex) * 10) / 10;

  const derived = calculateGrade(total);
  return {
    total,
    grade: derived.grade,
    points: derived.points,
    remark: derived.remark,
    hasScores: true,
    color: derived.color,
  };
}

export function computeClassRankings(students: Array<{ id: string; scores: SubjectScoreInput[] }>): Map<string, { rank: number; average: number | null }> {
  const evaluated = students.map((s) => {
    let totalScore = 0;
    let scoredSubjectCount = 0;

    for (const score of s.scores) {
      const res = computeSubjectGrade(score);
      if (res.hasScores && res.total !== null) {
        totalScore += res.total;
        scoredSubjectCount++;
      }
    }

    const average = scoredSubjectCount > 0 ? Math.round((totalScore / scoredSubjectCount) * 10) / 10 : null;
    return { id: s.id, average };
  });

  // Sort descending by average (nulls at the end)
  evaluated.sort((a, b) => {
    if (a.average === null && b.average === null) return 0;
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return b.average - a.average;
  });

  const resultMap = new Map<string, { rank: number; average: number | null }>();
  let currentRank = 1;

  for (let i = 0; i < evaluated.length; i++) {
    const item = evaluated[i];
    if (item.average === null) {
      resultMap.set(item.id, { rank: 0, average: null });
    } else {
      if (i > 0 && evaluated[i - 1].average !== null && evaluated[i - 1].average === item.average) {
        // Tie rank
        const prev = resultMap.get(evaluated[i - 1].id);
        resultMap.set(item.id, { rank: prev?.rank || currentRank, average: item.average });
      } else {
        resultMap.set(item.id, { rank: currentRank, average: item.average });
      }
      currentRank++;
    }
  }

  return resultMap;
}
