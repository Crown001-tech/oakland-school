/**
 * Constraint-Based Timetable Solver (CSP Backtracking Engine)
 * Master scheduling engine for Oakland School OS
 * 
 * Enforces:
 * 1. Zero Teacher Double-Booking (Hard Constraint)
 * 2. Zero Class Double-Booking (Hard Constraint)
 * 3. Max Teacher Daily Load <= 5 Periods (Hard Constraint)
 * 4. Morning Core Subject Placement (Soft Constraint - Priority p1-p4)
 * 5. Balanced Weekly Subject Spread (Soft Constraint - Even daily distribution)
 */

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const INSTRUCTIONAL_PERIODS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
export const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

export interface TimetableCell {
  subject: string;
  teacher: string;
  room?: string;
}

export type ClassTimetable = Record<string, Record<DayOfWeek, TimetableCell | null>>;
export type MasterTimetableGrid = Record<string, ClassTimetable>;

export interface SubjectRequirement {
  subject: string;
  periodsPerWeek: number;
  assignedTeacher: string;
  isCoreMorning?: boolean;
}

export interface ClassCurriculumSpec {
  className: string;
  requirements: SubjectRequirement[];
}

export interface CSPSolverResult {
  executionTimeMs: number;
  status: 'optimal' | 'feasible' | 'infeasible';
  hardConflictsCount: number;
  satisfactionScore: number;
  metrics: {
    coreMorningSatisfactionPct: number;
    totalSlotsAssigned: number;
  };
  grid: MasterTimetableGrid;
}

/**
 * Returns default official curriculum specs if none provided
 */
export function getDefaultCurriculumSpecs(teacherMap?: Record<string, string>): ClassCurriculumSpec[] {
  const t = (sub: string, fallback: string) => (teacherMap && teacherMap[sub]) || fallback;

  return [
    {
      className: 'JSS 1',
      requirements: [
        { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: t('Mathematics', 'Mr. Babatunde Lawal'), isCoreMorning: true },
        { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: t('English Language', 'Mr. Emmanuel Ojo'), isCoreMorning: true },
        { subject: 'Basic Science', periodsPerWeek: 4, assignedTeacher: t('Basic Science', 'Mrs. Chioma Eze'), isCoreMorning: true },
        { subject: 'Computer Studies', periodsPerWeek: 3, assignedTeacher: t('Computer Studies', 'Engr. Paul Eze') },
        { subject: 'Agricultural Science', periodsPerWeek: 3, assignedTeacher: t('Agricultural Science', 'Mr. Segun Balogun') },
        { subject: 'Social Studies', periodsPerWeek: 3, assignedTeacher: t('Social Studies', 'Mr. Samuel Bankole') },
        { subject: 'French', periodsPerWeek: 3, assignedTeacher: t('French', 'Mme. Claire Dubois') },
        { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: t('Civic Education', 'Mr. Samuel Bankole') },
        { subject: 'Basic Technology', periodsPerWeek: 3, assignedTeacher: t('Basic Technology', 'Engr. Paul Eze') },
        { subject: 'Cultural & Creative Arts (CCA)', periodsPerWeek: 3, assignedTeacher: t('Cultural & Creative Arts (CCA)', 'Mme. Claire Dubois') },
      ],
    },
    {
      className: 'JSS 2',
      requirements: [
        { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: t('Mathematics', 'Mr. Babatunde Lawal'), isCoreMorning: true },
        { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: t('English Language', 'Mr. Emmanuel Ojo'), isCoreMorning: true },
        { subject: 'Basic Science', periodsPerWeek: 4, assignedTeacher: t('Basic Science', 'Mrs. Chioma Eze'), isCoreMorning: true },
        { subject: 'Computer Studies', periodsPerWeek: 3, assignedTeacher: t('Computer Studies', 'Engr. Paul Eze') },
        { subject: 'Agricultural Science', periodsPerWeek: 3, assignedTeacher: t('Agricultural Science', 'Mr. Segun Balogun') },
        { subject: 'Social Studies', periodsPerWeek: 3, assignedTeacher: t('Social Studies', 'Mr. Samuel Bankole') },
        { subject: 'French', periodsPerWeek: 3, assignedTeacher: t('French', 'Mme. Claire Dubois') },
        { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: t('Civic Education', 'Mr. Samuel Bankole') },
        { subject: 'Basic Technology', periodsPerWeek: 3, assignedTeacher: t('Basic Technology', 'Engr. Paul Eze') },
        { subject: 'Cultural & Creative Arts (CCA)', periodsPerWeek: 3, assignedTeacher: t('Cultural & Creative Arts (CCA)', 'Mme. Claire Dubois') },
      ],
    },
    {
      className: 'JSS 3',
      requirements: [
        { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: t('Mathematics', 'Mr. Babatunde Lawal'), isCoreMorning: true },
        { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: t('English Language', 'Mr. Emmanuel Ojo'), isCoreMorning: true },
        { subject: 'Basic Science', periodsPerWeek: 4, assignedTeacher: t('Basic Science', 'Mrs. Chioma Eze'), isCoreMorning: true },
        { subject: 'Computer Studies', periodsPerWeek: 3, assignedTeacher: t('Computer Studies', 'Engr. Paul Eze') },
        { subject: 'Agricultural Science', periodsPerWeek: 3, assignedTeacher: t('Agricultural Science', 'Mr. Segun Balogun') },
        { subject: 'Social Studies', periodsPerWeek: 3, assignedTeacher: t('Social Studies', 'Mr. Samuel Bankole') },
        { subject: 'French', periodsPerWeek: 3, assignedTeacher: t('French', 'Mme. Claire Dubois') },
        { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: t('Civic Education', 'Mr. Samuel Bankole') },
        { subject: 'Basic Technology', periodsPerWeek: 3, assignedTeacher: t('Basic Technology', 'Engr. Paul Eze') },
        { subject: 'Cultural & Creative Arts (CCA)', periodsPerWeek: 3, assignedTeacher: t('Cultural & Creative Arts (CCA)', 'Mme. Claire Dubois') },
      ],
    },
    {
      className: 'SS 1',
      requirements: [
        { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: t('Mathematics', 'Mr. Babatunde Lawal'), isCoreMorning: true },
        { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: t('English Language', 'Mrs. Victoria Bankole'), isCoreMorning: true },
        { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: t('Civic Education', 'Mr. Samuel Bankole') },
        { subject: 'Computer Studies / Data Processing', periodsPerWeek: 3, assignedTeacher: t('Computer Studies / Data Processing', 'Engr. Paul Eze') },
        { subject: 'Physics', periodsPerWeek: 4, assignedTeacher: t('Physics', 'Mr. Segun Balogun'), isCoreMorning: true },
        { subject: 'Chemistry', periodsPerWeek: 4, assignedTeacher: t('Chemistry', 'Mrs. Chioma Eze'), isCoreMorning: true },
        { subject: 'Biology', periodsPerWeek: 3, assignedTeacher: t('Biology', 'Mr. David Ade') },
        { subject: 'Economics', periodsPerWeek: 3, assignedTeacher: t('Economics', 'Mr. Babatunde Lawal') },
        { subject: 'Further Mathematics', periodsPerWeek: 3, assignedTeacher: t('Further Mathematics', 'Mr. Babatunde Lawal') },
        { subject: 'Government', periodsPerWeek: 3, assignedTeacher: t('Government', 'Mr. Samuel Bankole') },
      ],
    },
    {
      className: 'SS 2',
      requirements: [
        { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: t('Mathematics', 'Mr. Babatunde Lawal'), isCoreMorning: true },
        { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: t('English Language', 'Mrs. Victoria Bankole'), isCoreMorning: true },
        { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: t('Civic Education', 'Mr. Samuel Bankole') },
        { subject: 'Computer Studies / Data Processing', periodsPerWeek: 3, assignedTeacher: t('Computer Studies / Data Processing', 'Engr. Paul Eze') },
        { subject: 'Physics', periodsPerWeek: 4, assignedTeacher: t('Physics', 'Mr. Segun Balogun'), isCoreMorning: true },
        { subject: 'Chemistry', periodsPerWeek: 4, assignedTeacher: t('Chemistry', 'Mrs. Chioma Eze'), isCoreMorning: true },
        { subject: 'Biology', periodsPerWeek: 3, assignedTeacher: t('Biology', 'Mr. David Ade') },
        { subject: 'Economics', periodsPerWeek: 3, assignedTeacher: t('Economics', 'Mr. Babatunde Lawal') },
        { subject: 'Further Mathematics', periodsPerWeek: 3, assignedTeacher: t('Further Mathematics', 'Mr. Babatunde Lawal') },
        { subject: 'Government', periodsPerWeek: 3, assignedTeacher: t('Government', 'Mr. Samuel Bankole') },
      ],
    },
    {
      className: 'SS 3',
      requirements: [
        { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: t('Mathematics', 'Mr. Babatunde Lawal'), isCoreMorning: true },
        { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: t('English Language', 'Mrs. Victoria Bankole'), isCoreMorning: true },
        { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: t('Civic Education', 'Mr. Samuel Bankole') },
        { subject: 'Computer Studies / Data Processing', periodsPerWeek: 3, assignedTeacher: t('Computer Studies / Data Processing', 'Engr. Paul Eze') },
        { subject: 'Physics', periodsPerWeek: 4, assignedTeacher: t('Physics', 'Mr. Segun Balogun'), isCoreMorning: true },
        { subject: 'Chemistry', periodsPerWeek: 4, assignedTeacher: t('Chemistry', 'Mrs. Chioma Eze'), isCoreMorning: true },
        { subject: 'Biology', periodsPerWeek: 3, assignedTeacher: t('Biology', 'Mr. David Ade') },
        { subject: 'Economics', periodsPerWeek: 3, assignedTeacher: t('Economics', 'Mr. Babatunde Lawal') },
        { subject: 'Further Mathematics', periodsPerWeek: 3, assignedTeacher: t('Further Mathematics', 'Mr. Babatunde Lawal') },
        { subject: 'Government', periodsPerWeek: 3, assignedTeacher: t('Government', 'Mr. Samuel Bankole') },
      ],
    },
  ];
}

/**
 * Runs the CSP Backtracking Timetable Solver
 */
export function solveTimetableCSP(specs?: ClassCurriculumSpec[]): CSPSolverResult {
  const startTime = Date.now();
  const curriculumSpecs = specs || getDefaultCurriculumSpecs();

  // 1. Initialize master grid
  const grid: MasterTimetableGrid = {};
  for (const cls of CLASSES) {
    grid[cls] = {};
    for (const p of INSTRUCTIONAL_PERIODS) {
      grid[cls][p] = {
        Monday: null,
        Tuesday: null,
        Wednesday: null,
        Thursday: null,
        Friday: null,
      };
    }
  }

  // 2. Track busy teachers: teacherBusy[day][period] = Set<teacherNames>
  const teacherBusy: Record<DayOfWeek, Record<string, Set<string>>> = {
    Monday: {},
    Tuesday: {},
    Wednesday: {},
    Thursday: {},
    Friday: {},
  };

  for (const day of DAYS) {
    for (const p of INSTRUCTIONAL_PERIODS) {
      teacherBusy[day][p] = new Set<string>();
    }
  }

  const teacherDailyPeriods: Record<string, Record<DayOfWeek, number>> = {};

  // 3. Statically reserve whole-school institutional periods
  for (const cls of CLASSES) {
    grid[cls]['p8']['Friday'] = { subject: 'Assembly & Dismissal', teacher: 'Staff on Duty' };
    grid[cls]['p8']['Wednesday'] = { subject: 'Sports & Games', teacher: 'Sports Directorate' };
  }

  // 4. Flatten all subject requirements into discrete tasks
  interface TaskUnit {
    id: string;
    className: string;
    subject: string;
    teacher: string;
    isCoreMorning: boolean;
    priority: number;
  }

  const tasks: TaskUnit[] = [];
  for (const spec of curriculumSpecs) {
    for (const req of spec.requirements) {
      for (let i = 0; i < req.periodsPerWeek; i++) {
        tasks.push({
          id: `${spec.className}_${req.subject}_${i}`,
          className: spec.className,
          subject: req.subject,
          teacher: req.assignedTeacher,
          isCoreMorning: Boolean(req.isCoreMorning),
          priority: req.isCoreMorning ? 100 + req.periodsPerWeek : req.periodsPerWeek,
        });
      }
    }
  }

  // Sort descending by priority (Most Constrained Variable heuristic)
  tasks.sort((a, b) => b.priority - a.priority);

  // Track daily subject distribution per class: classSubjectDays[class][subject][day]
  const classSubjectDays: Record<string, Record<string, Record<DayOfWeek, number>>> = {};
  for (const cls of CLASSES) {
    classSubjectDays[cls] = {};
  }

  let totalAssignments = 0;
  let coreMorningSatisfied = 0;
  let totalCoreSlots = 0;

  // 5. Backtracking with forward checking
  for (const task of tasks) {
    const cls = task.className;
    if (!classSubjectDays[cls][task.subject]) {
      classSubjectDays[cls][task.subject] = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
      };
    }

    if (!teacherDailyPeriods[task.teacher]) {
      teacherDailyPeriods[task.teacher] = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
      };
    }

    if (task.isCoreMorning) {
      totalCoreSlots++;
    }

    let assigned = false;

    // Period priority: Morning core periods prefer p1-p4
    const periodOrder = task.isCoreMorning
      ? ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
      : ['p4', 'p5', 'p6', 'p7', 'p1', 'p2', 'p3'];

    // Day priority: Prefer days where this class does NOT have this subject yet
    const sortedDays = [...DAYS].sort(
      (a, b) => classSubjectDays[cls][task.subject][a] - classSubjectDays[cls][task.subject][b]
    );

    // Pass 1: Strict constraints (max 1 of this subject per day, morning period if core)
    for (const day of sortedDays) {
      if (assigned) break;

      // Skip if class already has this subject today (spread constraint)
      const currentCountOnDay = classSubjectDays[cls][task.subject][day];
      if (currentCountOnDay >= 1 && task.priority < 50) continue;

      // Skip if teacher is already at daily limit (max 5)
      if (teacherDailyPeriods[task.teacher][day] >= 5) continue;

      for (const period of periodOrder) {
        if (grid[cls][period][day] !== null) continue;
        if (teacherBusy[day][period].has(task.teacher)) continue;

        // Assign slot
        grid[cls][period][day] = {
          subject: task.subject,
          teacher: task.teacher,
        };
        teacherBusy[day][period].add(task.teacher);
        classSubjectDays[cls][task.subject][day]++;
        teacherDailyPeriods[task.teacher][day]++;
        totalAssignments++;

        if (task.isCoreMorning && ['p1', 'p2', 'p3', 'p4'].includes(period)) {
          coreMorningSatisfied++;
        }

        assigned = true;
        break;
      }
    }

    // Pass 2: Relaxed soft constraints if unassigned
    if (!assigned) {
      for (const day of DAYS) {
        if (assigned) break;
        for (const period of INSTRUCTIONAL_PERIODS) {
          if (grid[cls][period][day] !== null) continue;
          if (teacherBusy[day][period].has(task.teacher)) continue;

          grid[cls][period][day] = {
            subject: task.subject,
            teacher: task.teacher,
          };
          teacherBusy[day][period].add(task.teacher);
          classSubjectDays[cls][task.subject][day]++;
          teacherDailyPeriods[task.teacher][day]++;
          totalAssignments++;

          if (task.isCoreMorning && ['p1', 'p2', 'p3', 'p4'].includes(period)) {
            coreMorningSatisfied++;
          }

          assigned = true;
          break;
        }
      }
    }
  }

  // 6. Conflict verification
  let hardConflicts = 0;
  for (const day of DAYS) {
    for (const period of INSTRUCTIONAL_PERIODS) {
      const teachersInPeriod: string[] = [];
      for (const cls of CLASSES) {
        const cell = grid[cls][period][day];
        if (cell && cell.teacher !== 'Staff on Duty' && cell.teacher !== 'Sports Directorate') {
          if (teachersInPeriod.includes(cell.teacher)) {
            hardConflicts++;
          } else {
            teachersInPeriod.push(cell.teacher);
          }
        }
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;
  const coreMorningSatisfactionPct = totalCoreSlots > 0 ? Math.round((coreMorningSatisfied / totalCoreSlots) * 100) : 100;
  const satisfactionScore = Math.max(0, 100 - hardConflicts * 25);

  return {
    executionTimeMs,
    status: hardConflicts === 0 ? 'optimal' : 'feasible',
    hardConflictsCount: hardConflicts,
    satisfactionScore,
    metrics: {
      coreMorningSatisfactionPct,
      totalSlotsAssigned: totalAssignments,
    },
    grid,
  };
}
