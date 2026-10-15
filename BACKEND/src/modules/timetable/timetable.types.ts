export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface PeriodDefinition {
  id: string;
  label: string;
  time: string;
  isBreak?: boolean;
}

export interface TimetableCell {
  subject: string;
  teacher: string;
  room?: string;
}

export type ClassTimetable = Record<string, Record<DayOfWeek, TimetableCell | null>>;
export type MasterTimetableGrid = Record<string, ClassTimetable>;

export interface SubjectCurriculumRequirement {
  subject: string;
  periodsPerWeek: number;
  assignedTeacher: string;
  isCoreMorning?: boolean;
  roomPreference?: string;
}

export interface ClassCurriculumSpec {
  className: string;
  requirements: SubjectCurriculumRequirement[];
}

export interface SolverConstraint {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  ruleType: string;
  weight: number;
  parameters: Record<string, any>;
  isActive: boolean;
}

export interface ConflictDetail {
  type: 'teacher_double_booked' | 'class_double_booked' | 'teacher_overloaded';
  day: DayOfWeek;
  period: string;
  teacher?: string;
  classes?: string[];
  message: string;
}

export interface SolverResult {
  versionId: string;
  academicYear: string;
  term: string;
  generatedAt: string;
  executionTimeMs: number;
  status: 'optimal' | 'feasible' | 'infeasible';
  hardConflictsCount: number;
  conflictDetails: ConflictDetail[];
  satisfactionScore: number; // 0 - 100%
  metrics: {
    coreMorningSatisfactionPct: number;
    distributionSpreadPct: number;
    teacherIdleGapScore: number;
    totalSlotsAssigned: number;
  };
  grid: MasterTimetableGrid;
}

export interface TimetableVersionSummary {
  id: string;
  name: string;
  academicYear: string;
  term: string;
  status: 'draft' | 'published' | 'archived';
  conflictCount: number;
  satisfactionScore: number;
  createdAt: string;
  publishedAt?: string;
}
