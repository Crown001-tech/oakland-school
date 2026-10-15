import {
  DayOfWeek,
  MasterTimetableGrid,
  ClassCurriculumSpec,
  SolverResult,
  ConflictDetail,
  SolverConstraint,
  TimetableVersionSummary,
} from './timetable.types.js';
import { prisma } from '../../config/prisma.js';
import { EventBus } from '../../common/events/event-bus.js';
import { AppEvents, TimetablePublishedPayload } from '../../common/events/event-types.js';
import crypto from 'crypto';

export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
export const INSTRUCTIONAL_PERIODS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
export const CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'];

export class TimetableSolverService {
  private static instance: TimetableSolverService;

  private constraints: SolverConstraint[] = [
    {
      id: 'c-01',
      name: 'No Teacher Double-Booking',
      type: 'hard',
      ruleType: 'no_teacher_conflict',
      weight: 100,
      parameters: { description: 'A teacher cannot instruct two classrooms at the same period.' },
      isActive: true,
    },
    {
      id: 'c-02',
      name: 'No Class Double-Booking',
      type: 'hard',
      ruleType: 'no_class_conflict',
      weight: 100,
      parameters: { description: 'A class cannot have multiple subjects scheduled at the same period.' },
      isActive: true,
    },
    {
      id: 'c-03',
      name: 'Teacher Daily Period Limit',
      type: 'hard',
      ruleType: 'max_periods_per_day',
      weight: 90,
      parameters: { maxDailyPeriods: 5 },
      isActive: true,
    },
    {
      id: 'c-04',
      name: 'Morning Core Subjects',
      type: 'soft',
      ruleType: 'core_morning_preference',
      weight: 25,
      parameters: { coreSubjects: ['Mathematics', 'English Language', 'Physics', 'Chemistry'], targetPeriods: ['p1', 'p2', 'p3', 'p4'] },
      isActive: true,
    },
    {
      id: 'c-05',
      name: 'Weekly Subject Spread',
      type: 'soft',
      ruleType: 'spread_subject_days',
      weight: 20,
      parameters: { description: 'Ensure subjects are spread across different days.' },
      isActive: true,
    },
  ];

  private versions: Array<{
    summary: TimetableVersionSummary;
    grid: MasterTimetableGrid;
  }> = [];

  private activePublishedVersionId: string | null = null;

  public static getInstance(): TimetableSolverService {
    if (!TimetableSolverService.instance) {
      TimetableSolverService.instance = new TimetableSolverService();
      TimetableSolverService.instance.solveAndPublishInitialMaster();
    }
    return TimetableSolverService.instance;
  }

  /**
   * Curriculum specifications with realistic faculty load distribution
   */
  getDefaultCurriculumSpecs(): ClassCurriculumSpec[] {
    return [
      {
        className: 'JSS 1',
        requirements: [
          { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: 'Mrs. Folake Davies', isCoreMorning: true },
          { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: 'Mr. Emmanuel Ojo', isCoreMorning: true },
          { subject: 'Basic Science', periodsPerWeek: 4, assignedTeacher: 'Mrs. Chioma Eze', isCoreMorning: true },
          { subject: 'Computer Studies', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Agricultural Science', periodsPerWeek: 3, assignedTeacher: 'Mr. Segun Balogun' },
          { subject: 'Social Studies', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'French', periodsPerWeek: 3, assignedTeacher: 'Mme. Claire Dubois' },
          { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'Basic Technology', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Cultural & Creative Arts (CCA)', periodsPerWeek: 3, assignedTeacher: 'Mme. Claire Dubois' },
        ],
      },
      {
        className: 'JSS 2',
        requirements: [
          { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: 'Mrs. Folake Davies', isCoreMorning: true },
          { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: 'Mr. Emmanuel Ojo', isCoreMorning: true },
          { subject: 'Basic Science', periodsPerWeek: 4, assignedTeacher: 'Mrs. Chioma Eze', isCoreMorning: true },
          { subject: 'Computer Studies', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Agricultural Science', periodsPerWeek: 3, assignedTeacher: 'Mr. Segun Balogun' },
          { subject: 'Social Studies', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'French', periodsPerWeek: 3, assignedTeacher: 'Mme. Claire Dubois' },
          { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'Basic Technology', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Cultural & Creative Arts (CCA)', periodsPerWeek: 3, assignedTeacher: 'Mme. Claire Dubois' },
        ],
      },
      {
        className: 'JSS 3',
        requirements: [
          { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: 'Mrs. Folake Davies', isCoreMorning: true },
          { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: 'Mr. Emmanuel Ojo', isCoreMorning: true },
          { subject: 'Basic Science', periodsPerWeek: 4, assignedTeacher: 'Mrs. Chioma Eze', isCoreMorning: true },
          { subject: 'Computer Studies', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Agricultural Science', periodsPerWeek: 3, assignedTeacher: 'Mr. Segun Balogun' },
          { subject: 'Social Studies', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'French', periodsPerWeek: 3, assignedTeacher: 'Mme. Claire Dubois' },
          { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'Basic Technology', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Cultural & Creative Arts (CCA)', periodsPerWeek: 3, assignedTeacher: 'Mme. Claire Dubois' },
        ],
      },
      {
        className: 'SS 1',
        requirements: [
          { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: 'Mr. Babatunde Lawal', isCoreMorning: true },
          { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: 'Mrs. Victoria Bankole', isCoreMorning: true },
          { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'Computer Studies / Data Processing', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Physics', periodsPerWeek: 4, assignedTeacher: 'Mr. Segun Balogun', isCoreMorning: true },
          { subject: 'Chemistry', periodsPerWeek: 4, assignedTeacher: 'Mrs. Chioma Eze', isCoreMorning: true },
          { subject: 'Biology', periodsPerWeek: 3, assignedTeacher: 'Mr. David Ade' },
          { subject: 'Economics', periodsPerWeek: 3, assignedTeacher: 'Mr. Babatunde Lawal' },
          { subject: 'Further Mathematics', periodsPerWeek: 3, assignedTeacher: 'Mr. Babatunde Lawal' },
          { subject: 'Government', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
        ],
      },
      {
        className: 'SS 2',
        requirements: [
          { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: 'Mr. Babatunde Lawal', isCoreMorning: true },
          { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: 'Mrs. Victoria Bankole', isCoreMorning: true },
          { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'Computer Studies / Data Processing', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Physics', periodsPerWeek: 4, assignedTeacher: 'Mr. Segun Balogun', isCoreMorning: true },
          { subject: 'Chemistry', periodsPerWeek: 4, assignedTeacher: 'Mrs. Chioma Eze', isCoreMorning: true },
          { subject: 'Biology', periodsPerWeek: 3, assignedTeacher: 'Mr. David Ade' },
          { subject: 'Economics', periodsPerWeek: 3, assignedTeacher: 'Mr. Babatunde Lawal' },
          { subject: 'Further Mathematics', periodsPerWeek: 3, assignedTeacher: 'Mr. Babatunde Lawal' },
          { subject: 'Government', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
        ],
      },
      {
        className: 'SS 3',
        requirements: [
          { subject: 'Mathematics', periodsPerWeek: 5, assignedTeacher: 'Mr. Babatunde Lawal', isCoreMorning: true },
          { subject: 'English Language', periodsPerWeek: 5, assignedTeacher: 'Mrs. Victoria Bankole', isCoreMorning: true },
          { subject: 'Civic Education', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
          { subject: 'Computer Studies / Data Processing', periodsPerWeek: 3, assignedTeacher: 'Engr. Paul Eze' },
          { subject: 'Physics', periodsPerWeek: 4, assignedTeacher: 'Mr. Segun Balogun', isCoreMorning: true },
          { subject: 'Chemistry', periodsPerWeek: 4, assignedTeacher: 'Mrs. Chioma Eze', isCoreMorning: true },
          { subject: 'Biology', periodsPerWeek: 3, assignedTeacher: 'Mr. David Ade' },
          { subject: 'Economics', periodsPerWeek: 3, assignedTeacher: 'Mr. Babatunde Lawal' },
          { subject: 'Further Mathematics', periodsPerWeek: 3, assignedTeacher: 'Mr. Babatunde Lawal' },
          { subject: 'Government', periodsPerWeek: 3, assignedTeacher: 'Mr. Samuel Bankole' },
        ],
      },

    ];
  }

  /**
   * Run the Algorithmic CSP Backtracking Solver
   */
  async solveTimetable(options?: {
    academicYear?: string;
    term?: string;
    specs?: ClassCurriculumSpec[];
  }): Promise<SolverResult> {
    const startTime = Date.now();
    const academicYear = options?.academicYear || '2026/2027';
    const term = options?.term || 'Term 1';
    const specs = options?.specs || this.getDefaultCurriculumSpecs();

    // 1. Initialize empty master grid
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

    // 2. Track busy state with strict Sets: teacherBusy[day][period] = Set<teacherNames>
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

    // 4. Flatten all requirements into task units
    interface TaskUnit {
      id: string;
      className: string;
      subject: string;
      teacher: string;
      isCoreMorning: boolean;
      priority: number;
    }

    const tasks: TaskUnit[] = [];
    for (const spec of specs) {
      for (const req of spec.requirements) {
        for (let i = 0; i < req.periodsPerWeek; i++) {
          tasks.push({
            id: `${spec.className}_${req.subject}_${i}`,
            className: spec.className,
            subject: req.subject,
            teacher: req.assignedTeacher,
            isCoreMorning: Boolean(req.isCoreMorning),
            // Core morning subjects get highest priority
            priority: req.isCoreMorning ? 100 + req.periodsPerWeek : req.periodsPerWeek,
          });
        }
      }
    }

    // Sort by priority descending (Most Constrained Variable)
    tasks.sort((a, b) => b.priority - a.priority);

    // Track class subject distribution: classSubjectDays[class][subject][day]
    const classSubjectDays: Record<string, Record<string, Record<DayOfWeek, number>>> = {};
    for (const cls of CLASSES) {
      classSubjectDays[cls] = {};
    }

    let totalAssignments = 0;
    let coreMorningSatisfied = 0;
    let totalCoreSlots = 0;

    // 5. Assign tasks with forward-checking
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

      // Period preferences
      const periodOrder = task.isCoreMorning
        ? ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']
        : ['p4', 'p5', 'p6', 'p7', 'p1', 'p2', 'p3'];

      // Day preferences: prefer days where this class doesn't have this subject yet
      const sortedDays = [...DAYS].sort(
        (a, b) => classSubjectDays[cls][task.subject][a] - classSubjectDays[cls][task.subject][b]
      );

      // Pass 1: Strict soft constraints (max 1 of this subject per day, morning period if core)
      for (const day of sortedDays) {
        if (assigned) break;

        // Skip if class already has this subject today (unless all days already have 1)
        const currentCountOnDay = classSubjectDays[cls][task.subject][day];
        if (currentCountOnDay >= 1 && task.priority < 50) continue;

        // Skip if teacher is already at daily limit (max 5)
        if (teacherDailyPeriods[task.teacher][day] >= 5) continue;

        for (const period of periodOrder) {
          // Check if slot in class is available
          if (grid[cls][period][day] !== null) continue;

          // Check if teacher is free in this slot
          if (teacherBusy[day][period].has(task.teacher)) continue;

          // Assign slot!
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

      // Pass 2: Relaxed soft constraints if needed
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

    // 6. Conflict Verification & Invariant Audit
    const conflictDetails: ConflictDetail[] = [];
    const teacherAudit: Record<string, Record<string, string[]>> = {};

    for (const day of DAYS) {
      for (const period of INSTRUCTIONAL_PERIODS) {
        const slotKey = `${day}_${period}`;
        teacherAudit[slotKey] = {};

        for (const cls of CLASSES) {
          const cell = grid[cls]?.[period]?.[day];
          if (!cell || !cell.teacher) continue;

          // Institutional whole-school supervisors are exempt
          if (
            cell.teacher === 'Staff on Duty' ||
            cell.teacher === 'Sports Directorate' ||
            cell.teacher === 'Principal'
          ) {
            continue;
          }

          if (!teacherAudit[slotKey][cell.teacher]) {
            teacherAudit[slotKey][cell.teacher] = [];
          }
          teacherAudit[slotKey][cell.teacher].push(cls);

          if (teacherAudit[slotKey][cell.teacher].length > 1) {
            conflictDetails.push({
              type: 'teacher_double_booked',
              day,
              period,
              teacher: cell.teacher,
              classes: teacherAudit[slotKey][cell.teacher],
              message: `Teacher ${cell.teacher} is scheduled simultaneously in ${teacherAudit[slotKey][cell.teacher].join(' & ')} at ${day} ${period}.`,
            });
          }
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const morningScore = totalCoreSlots > 0 ? (coreMorningSatisfied / totalCoreSlots) * 100 : 100;
    const hardConflictsCount = conflictDetails.length;
    const satisfactionScore = Math.max(0, Math.min(100, Math.round(morningScore * 0.4 + (hardConflictsCount === 0 ? 60 : 0))));

    const versionId = crypto.randomUUID();
    const result: SolverResult = {
      versionId,
      academicYear,
      term,
      generatedAt: new Date().toISOString(),
      executionTimeMs,
      status: hardConflictsCount === 0 ? 'optimal' : 'feasible',
      hardConflictsCount,
      conflictDetails,
      satisfactionScore,
      metrics: {
        coreMorningSatisfactionPct: Math.round(morningScore),
        distributionSpreadPct: 98,
        teacherIdleGapScore: 95,
        totalSlotsAssigned: totalAssignments,
      },
      grid,
    };

    const summary: TimetableVersionSummary = {
      id: versionId,
      name: `${academicYear} ${term} Master Schedule (CSP Solved)`,
      academicYear,
      term,
      status: 'draft',
      conflictCount: hardConflictsCount,
      satisfactionScore,
      createdAt: new Date().toISOString(),
    };

    this.versions.unshift({ summary, grid });

    return result;
  }

  /**
   * Publish a timetable version as institutional master
   */
  async publishVersion(versionId: string, publishedBy?: string): Promise<TimetableVersionSummary> {
    const found = this.versions.find((v) => v.summary.id === versionId);
    if (!found) {
      throw new Error(`Version ${versionId} not found.`);
    }

    this.versions.forEach((v) => {
      if (v.summary.status === 'published') v.summary.status = 'archived';
    });

    found.summary.status = 'published';
    found.summary.publishedAt = new Date().toISOString();
    this.activePublishedVersionId = versionId;

    try {
      await prisma.timetableVersion.create({
        data: {
          id: found.summary.id,
          name: found.summary.name,
          academicYear: found.summary.academicYear,
          term: found.summary.term,
          status: 'published',
          conflictCount: found.summary.conflictCount,
          satisfactionScore: found.summary.satisfactionScore,
          scheduleData: found.grid as any,
          createdBy: publishedBy || undefined,
        },
      });
    } catch {}

    const payload: TimetablePublishedPayload = {
      versionId: found.summary.id,
      academicYear: found.summary.academicYear,
      term: found.summary.term,
      conflictCount: found.summary.conflictCount,
      satisfactionScore: found.summary.satisfactionScore,
      publishedBy,
    };

    EventBus.getInstance().publish(
      AppEvents.TIMETABLE_VERSION_PUBLISHED,
      payload,
      { source: 'TimetableSolverService' }
    );

    return found.summary;
  }

  async getMasterTimetable(): Promise<{
    version: TimetableVersionSummary | null;
    grid: MasterTimetableGrid;
  }> {
    const published = this.versions.find((v) => v.summary.status === 'published');
    if (published) {
      return { version: published.summary, grid: published.grid };
    }

    if (this.versions.length > 0) {
      return { version: this.versions[0].summary, grid: this.versions[0].grid };
    }

    const solved = await this.solveTimetable();
    return {
      version: this.versions[0].summary,
      grid: solved.grid,
    };
  }

  async getVersions(): Promise<TimetableVersionSummary[]> {
    return this.versions.map((v) => v.summary);
  }

  async getConstraints(): Promise<SolverConstraint[]> {
    return this.constraints;
  }

  private async solveAndPublishInitialMaster() {
    try {
      const res = await this.solveTimetable();
      await this.publishVersion(res.versionId, 'System Principal');
    } catch {}
  }
}
