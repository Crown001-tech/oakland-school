/**
 * Academic grading and broadsheet evaluation.
 * Strict Zero Placeholder Invariant: returns null and 'Scores Pending' when marks are missing.
 *
 * Every function takes the school's grading configuration (see lib/grading-config.ts) and falls back
 * to the starter pack, so one codebase grades any school by its own settings.
 */

import { STARTER_GRADING_CONFIG, bandFor, type GradingConfig } from '@/lib/grading-config';

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

// Badge colours from the top band down; a scale with more bands reuses the last
const BAND_COLORS = [
  'text-emerald-700 bg-emerald-50 border-emerald-200',
  'text-teal-700 bg-teal-50 border-teal-200',
  'text-blue-700 bg-blue-50 border-blue-200',
  'text-indigo-700 bg-indigo-50 border-indigo-200',
  'text-amber-700 bg-amber-50 border-amber-200',
  'text-rose-700 bg-rose-50 border-rose-200',
];

export function calculateGrade(
  total: number,
  config: GradingConfig = STARTER_GRADING_CONFIG
): { grade: string; points: number; remark: string; color: string } {
  const band = bandFor(total, config);
  const index = config.scale.indexOf(band);
  const isLast = index === config.scale.length - 1;
  return {
    grade: band.grade,
    points: band.points,
    remark: band.remark,
    color: isLast ? BAND_COLORS[BAND_COLORS.length - 1] : BAND_COLORS[Math.min(index, BAND_COLORS.length - 2)],
  };
}

export function computeSubjectGrade(score: SubjectScoreInput, config: GradingConfig = STARTER_GRADING_CONFIG): GradeResult {
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

  const c1 = hasCa1 ? Math.min(config.ca1Max, Math.max(0, score.ca1!)) : 0;
  const c2 = hasCa2 ? Math.min(config.ca2Max, Math.max(0, score.ca2!)) : 0;
  const ex = hasExam ? Math.min(config.examMax, Math.max(0, score.exam!)) : 0;
  const total = Math.round((c1 + c2 + ex) * 10) / 10;

  const derived = calculateGrade(total, config);
  return {
    total,
    grade: derived.grade,
    points: derived.points,
    remark: derived.remark,
    hasScores: true,
    color: derived.color,
  };
}

export function computeClassRankings(
  students: Array<{ id: string; scores: SubjectScoreInput[] }>,
  config: GradingConfig = STARTER_GRADING_CONFIG
): Map<string, { rank: number; average: number | null }> {
  const evaluated = students.map((s) => {
    let totalScore = 0;
    let scoredSubjectCount = 0;

    for (const score of s.scores) {
      const res = computeSubjectGrade(score, config);
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
