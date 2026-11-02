/**
 * A school's grading rules: the marks for each assessment, the pass mark and the grade bands.
 * They come from `schools.settings` (ca1Weight, ca2Weight, examWeight, passMark, gradingScale), so each
 * school sets its own. The starter values below are the "Nigerian secondary" pack a new school begins
 * with (20/20/60, pass at 50, A+ to F); a school's own settings always win.
 *
 * Weights must add up to 100, so a subject total is always out of 100. Settings that do not form a
 * valid configuration are ignored in favour of the starter pack rather than half-applied.
 */

export interface GradeBand {
  /** Lowest total that earns this grade. */
  min: number;
  grade: string;
  remark: string;
  points: number;
}

export interface GradingConfig {
  ca1Max: number;
  ca2Max: number;
  examMax: number;
  passMark: number;
  /** Highest band first. The last band starts at 0 so every total has a grade. */
  scale: GradeBand[];
}

export const STARTER_GRADE_SCALE: GradeBand[] = [
  { min: 90, grade: 'A+', remark: 'Distinction', points: 4.0 },
  { min: 80, grade: 'A', remark: 'Excellent', points: 4.0 },
  { min: 70, grade: 'B', remark: 'Very Good', points: 3.0 },
  { min: 60, grade: 'C', remark: 'Good Credit', points: 2.0 },
  { min: 50, grade: 'D', remark: 'Pass', points: 1.0 },
  { min: 0, grade: 'F', remark: 'Fail', points: 0.0 },
];

export const STARTER_GRADING_CONFIG: GradingConfig = {
  ca1Max: 20,
  ca2Max: 20,
  examMax: 60,
  passMark: 50,
  scale: STARTER_GRADE_SCALE,
};

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validScale(raw: unknown): GradeBand[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const bands: GradeBand[] = [];
  for (const item of raw) {
    if (!item || !isNumber(item.min) || item.min < 0 || item.min > 100) return null;
    if (typeof item.grade !== 'string' || !item.grade.trim()) return null;
    bands.push({
      min: item.min,
      grade: item.grade.trim(),
      remark: typeof item.remark === 'string' ? item.remark.trim() : '',
      points: isNumber(item.points) ? item.points : 0,
    });
  }
  bands.sort((a, b) => b.min - a.min);
  if (bands[bands.length - 1].min !== 0) return null;
  if (new Set(bands.map((b) => b.min)).size !== bands.length) return null;
  return bands;
}

export function resolveGradingConfig(settings: Record<string, unknown> | null | undefined): GradingConfig {
  const s = settings || {};
  const base = STARTER_GRADING_CONFIG;

  const ca1 = isNumber(s.ca1Weight) ? s.ca1Weight : base.ca1Max;
  const ca2 = isNumber(s.ca2Weight) ? s.ca2Weight : base.ca2Max;
  const exam = isNumber(s.examWeight) ? s.examWeight : base.examMax;
  const weightsOk = ca1 >= 0 && ca2 >= 0 && exam > 0 && Math.round((ca1 + ca2 + exam) * 100) / 100 === 100;

  const pass = isNumber(s.passMark) && s.passMark > 0 && s.passMark <= 100 ? s.passMark : base.passMark;

  return {
    ca1Max: weightsOk ? ca1 : base.ca1Max,
    ca2Max: weightsOk ? ca2 : base.ca2Max,
    examMax: weightsOk ? exam : base.examMax,
    passMark: pass,
    scale: validScale(s.gradingScale) ?? base.scale,
  };
}

/** The band for a total out of 100. */
export function bandFor(total: number, config: GradingConfig): GradeBand {
  return config.scale.find((band) => total >= band.min) ?? config.scale[config.scale.length - 1];
}
