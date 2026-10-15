import {
  QuestionBank,
  Question,
  Assessment,
  AssessmentQuestion,
  AssessmentSession,
  SessionAnswer,
  StartSessionDTO,
  SubmitAnswerDTO,
  AntiCheatEventDTO,
  CbtAnalytics,
  QuestionDifficultyMetric,
} from './cbt.types.js';
import { EventBus } from '../../common/events/event-bus.js';
import {
  AppEvents,
  CbtAssessmentPublishedPayload,
  CbtSessionSubmittedPayload,
  CbtAntiCheatFlaggedPayload,
} from '../../common/events/event-types.js';
import crypto from 'crypto';

export class CbtService {
  private static instance: CbtService;

  // In-memory persistent stores with full fallback guarantees
  private banks: QuestionBank[] = [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      title: 'JSS 3 Mathematics Core Term 1 Bank',
      subject: 'Mathematics',
      classLevel: 'JSS 3',
      description: 'Algebra, Quadratic Expansions, Plane Geometry, Statistics',
      createdBy: 'HOD Mathematics Mrs. Okafor',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      title: 'JSS 3 English Language & Lexis Bank',
      subject: 'English Language',
      classLevel: 'JSS 3',
      description: 'Grammatical Concord, Figures of Speech, Antonyms, Reading Comprehension',
      createdBy: 'HOD English Mrs. Bankole',
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    },
  ];

  private questions: Question[] = [
    {
      id: 'q0000000-0000-0000-0000-000000000001',
      bankId: 'b0000000-0000-0000-0000-000000000001',
      questionText: 'Simplify the algebraic expression: 3(2x - 5) + 4(x + 2).',
      questionType: 'mcq',
      options: [
        { id: 'A', text: '10x - 7' },
        { id: 'B', text: '10x - 23' },
        { id: 'C', text: '6x - 7' },
        { id: 'D', text: '10x + 7' },
      ],
      correctAnswer: 'A',
      explanation: '3(2x - 5) + 4(x + 2) = 6x - 15 + 4x + 8 = 10x - 7.',
      marks: 4,
      difficulty: 'medium',
      createdAt: '2026-09-01T08:10:00.000Z',
    },
    {
      id: 'q0000000-0000-0000-0000-000000000002',
      bankId: 'b0000000-0000-0000-0000-000000000001',
      questionText: 'What is the value of x if 2^(x + 3) = 64?',
      questionType: 'mcq',
      options: [
        { id: 'A', text: '2' },
        { id: 'B', text: '3' },
        { id: 'C', text: '4' },
        { id: 'D', text: '6' },
      ],
      correctAnswer: 'B',
      explanation: '64 is 2^6. Thus x + 3 = 6 => x = 3.',
      marks: 4,
      difficulty: 'medium',
      createdAt: '2026-09-01T08:12:00.000Z',
    },
    {
      id: 'q0000000-0000-0000-0000-000000000003',
      bankId: 'b0000000-0000-0000-0000-000000000001',
      questionText: 'The sum of the interior angles of a regular hexagon is 720 degrees.',
      questionType: 'true_false',
      options: [
        { id: 'True', text: 'True' },
        { id: 'False', text: 'False' },
      ],
      correctAnswer: 'True',
      explanation: 'Formula is (n - 2) * 180 = (6 - 2) * 180 = 4 * 180 = 720 degrees.',
      marks: 4,
      difficulty: 'easy',
      createdAt: '2026-09-01T08:15:00.000Z',
    },
    {
      id: 'q0000000-0000-0000-0000-000000000004',
      bankId: 'b0000000-0000-0000-0000-000000000001',
      questionText: 'If the radius of a circle is 7cm, calculate its area. (Take π = 22/7).',
      questionType: 'mcq',
      options: [
        { id: 'A', text: '154 cm²' },
        { id: 'B', text: '44 cm²' },
        { id: 'C', text: '308 cm²' },
        { id: 'D', text: '88 cm²' },
      ],
      correctAnswer: 'A',
      explanation: 'Area = π * r² = (22/7) * 7 * 7 = 154 cm².',
      marks: 4,
      difficulty: 'medium',
      createdAt: '2026-09-01T08:20:00.000Z',
    },
    {
      id: 'q0000000-0000-0000-0000-000000000005',
      bankId: 'b0000000-0000-0000-0000-000000000001',
      questionText: 'Find the median of the following set of test scores: 12, 18, 14, 25, 20, 16, 22.',
      questionType: 'mcq',
      options: [
        { id: 'A', text: '16' },
        { id: 'B', text: '18' },
        { id: 'C', text: '20' },
        { id: 'D', text: '17' },
      ],
      correctAnswer: 'B',
      explanation: 'Arrange in ascending order: 12, 14, 16, 18, 20, 22, 25. The 4th item (middle) is 18.',
      marks: 4,
      difficulty: 'hard',
      createdAt: '2026-09-01T08:25:00.000Z',
    },
  ];

  private assessments: Assessment[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      title: 'JSS 3 Mid-Term Computer-Based Mathematics Examination',
      code: 'CBT-2026-MTH-JSS3',
      subject: 'Mathematics',
      classLevel: 'JSS 3',
      term: 'First Term',
      academicYear: '2026/2027',
      durationMinutes: 30,
      totalMarks: 20,
      passPercentage: 50,
      shuffleQuestions: true,
      shuffleOptions: true,
      maxTabSwitches: 3,
      instructions:
        'Answer all questions. Each question carries equal weight. Ensure your browser remains focused — switching tabs or exiting full screen will register anti-cheat infractions and may lead to automatic examination forfeiture.',
      status: 'active',
      createdBy: 'Principal Dr. Mrs. Alabi',
      createdAt: '2026-09-10T09:00:00.000Z',
      updatedAt: '2026-09-10T09:00:00.000Z',
    },
  ];

  private assessmentQuestions: AssessmentQuestion[] = [
    { questionId: 'q0000000-0000-0000-0000-000000000001', orderIndex: 1, marks: 4 },
    { questionId: 'q0000000-0000-0000-0000-000000000002', orderIndex: 2, marks: 4 },
    { questionId: 'q0000000-0000-0000-0000-000000000003', orderIndex: 3, marks: 4 },
    { questionId: 'q0000000-0000-0000-0000-000000000004', orderIndex: 4, marks: 4 },
    { questionId: 'q0000000-0000-0000-0000-000000000005', orderIndex: 5, marks: 4 },
  ];

  private sessions: AssessmentSession[] = [
    {
      id: 's0000000-0000-0000-0000-000000000001',
      assessmentId: 'a0000000-0000-0000-0000-000000000001',
      studentId: 'b353f47a-9dcc-44dd-896b-3715d9b11a6b',
      studentName: 'Chinedu Okafor',
      studentClass: 'JSS 2',
      admissionNo: 'OAK-2026-001',
      status: 'submitted',
      startedAt: '2026-09-28T10:00:00.000Z',
      submittedAt: '2026-09-28T10:22:15.000Z',
      durationSeconds: 1335,
      scoreObtained: 16,
      percentage: 80,
      passed: true,
      tabSwitchCount: 0,
      antiCheatFlags: [],
      ipAddress: '192.168.1.42',
    },
  ];

  private sessionAnswers: SessionAnswer[] = [
    {
      id: 'ans-001',
      sessionId: 's0000000-0000-0000-0000-000000000001',
      questionId: 'q0000000-0000-0000-0000-000000000001',
      studentAnswer: 'A',
      isCorrect: true,
      marksAwarded: 4,
      answeredAt: '2026-09-28T10:05:00.000Z',
    },
    {
      id: 'ans-002',
      sessionId: 's0000000-0000-0000-0000-000000000001',
      questionId: 'q0000000-0000-0000-0000-000000000002',
      studentAnswer: 'B',
      isCorrect: true,
      marksAwarded: 4,
      answeredAt: '2026-09-28T10:09:00.000Z',
    },
    {
      id: 'ans-003',
      sessionId: 's0000000-0000-0000-0000-000000000001',
      questionId: 'q0000000-0000-0000-0000-000000000003',
      studentAnswer: 'True',
      isCorrect: true,
      marksAwarded: 4,
      answeredAt: '2026-09-28T10:14:00.000Z',
    },
    {
      id: 'ans-004',
      sessionId: 's0000000-0000-0000-0000-000000000001',
      questionId: 'q0000000-0000-0000-0000-000000000004',
      studentAnswer: 'A',
      isCorrect: true,
      marksAwarded: 4,
      answeredAt: '2026-09-28T10:18:00.000Z',
    },
    {
      id: 'ans-005',
      sessionId: 's0000000-0000-0000-0000-000000000001',
      questionId: 'q0000000-0000-0000-0000-000000000005',
      studentAnswer: 'C', // Incorrect (correct is B)
      isCorrect: false,
      marksAwarded: 0,
      answeredAt: '2026-09-28T10:21:00.000Z',
    },
  ];

  private constructor() {}

  public static getInstance(): CbtService {
    if (!CbtService.instance) {
      CbtService.instance = new CbtService();
    }
    return CbtService.instance;
  }

  // ==========================================
  // Question Bank Operations
  // ==========================================

  public async getQuestionBanks(subject?: string, classLevel?: string): Promise<QuestionBank[]> {
    let result = [...this.banks];
    if (subject) {
      result = result.filter((b) => b.subject.toLowerCase() === subject.toLowerCase());
    }
    if (classLevel) {
      result = result.filter((b) => b.classLevel.toLowerCase() === classLevel.toLowerCase());
    }

    return result.map((bank) => ({
      ...bank,
      questionsCount: this.questions.filter((q) => q.bankId === bank.id).length,
    }));
  }

  public async createQuestionBank(data: {
    title: string;
    subject: string;
    classLevel: string;
    description?: string;
    createdBy?: string;
  }): Promise<QuestionBank> {
    const newBank: QuestionBank = {
      id: crypto.randomUUID(),
      title: data.title,
      subject: data.subject,
      classLevel: data.classLevel,
      description: data.description,
      createdBy: data.createdBy || 'Academic Staff',
      questionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.banks.unshift(newBank);
    return newBank;
  }

  public async getQuestionsByBank(bankId: string): Promise<Question[]> {
    return this.questions.filter((q) => q.bankId === bankId);
  }

  public async addQuestion(data: {
    bankId: string;
    questionText: string;
    questionType: 'mcq' | 'true_false' | 'short_answer';
    options: { id: string; text: string }[];
    correctAnswer: string;
    explanation?: string;
    marks?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  }): Promise<Question> {
    const question: Question = {
      id: crypto.randomUUID(),
      bankId: data.bankId,
      questionText: data.questionText,
      questionType: data.questionType,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      marks: data.marks ?? 2,
      difficulty: data.difficulty ?? 'medium',
      createdAt: new Date().toISOString(),
    };

    this.questions.push(question);
    return question;
  }

  // ==========================================
  // Assessment Builder & Lifecycle
  // ==========================================

  public async getAssessments(classLevel?: string, subject?: string, status?: string): Promise<Assessment[]> {
    let result = [...this.assessments];
    if (classLevel) {
      result = result.filter((a) => a.classLevel.toLowerCase() === classLevel.toLowerCase());
    }
    if (subject) {
      result = result.filter((a) => a.subject.toLowerCase() === subject.toLowerCase());
    }
    if (status) {
      result = result.filter((a) => a.status === status);
    }
    return result;
  }

  public async getAssessmentById(id: string, redactAnswers = false): Promise<Assessment | null> {
    const assessment = this.assessments.find((a) => a.id === id);
    if (!assessment) return null;

    // Resolve linked questions
    const linkedQuestions = this.assessmentQuestions.map((aq) => {
      const q = this.questions.find((item) => item.id === aq.questionId);
      if (!q) return null;
      if (redactAnswers) {
        // Redact correct answer and explanation to prevent student client inspection
        const { correctAnswer, explanation, ...safeQ } = q;
        return {
          ...safeQ,
          correctAnswer: '',
          marks: aq.marks,
        } as Question;
      }
      return {
        ...q,
        marks: aq.marks,
      };
    }).filter(Boolean) as Question[];

    return {
      ...assessment,
      questions: linkedQuestions,
    };
  }

  public async createAssessment(data: {
    title: string;
    subject: string;
    classLevel: string;
    term?: string;
    durationMinutes?: number;
    passPercentage?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    maxTabSwitches?: number;
    instructions?: string;
    questionIds?: string[];
    createdBy?: string;
  }): Promise<Assessment> {
    const id = crypto.randomUUID();
    const code = `CBT-${new Date().getFullYear()}-${data.subject.substring(0, 3).toUpperCase()}-${data.classLevel.replace(/\s+/g, '')}`;

    let totalMarks = 0;
    const selectedQuestions = (data.questionIds || []).map((qId, idx) => {
      const q = this.questions.find((item) => item.id === qId);
      const marks = q ? q.marks : 2;
      totalMarks += marks;
      const aq: AssessmentQuestion = {
        questionId: qId,
        orderIndex: idx + 1,
        marks,
      };
      this.assessmentQuestions.push(aq);
      return aq;
    });

    const newAssessment: Assessment = {
      id,
      title: data.title,
      code,
      subject: data.subject,
      classLevel: data.classLevel,
      term: data.term || 'First Term',
      academicYear: '2026/2027',
      durationMinutes: data.durationMinutes || 30,
      totalMarks: totalMarks > 0 ? totalMarks : 20,
      passPercentage: data.passPercentage || 50,
      shuffleQuestions: data.shuffleQuestions ?? true,
      shuffleOptions: data.shuffleOptions ?? true,
      maxTabSwitches: data.maxTabSwitches || 3,
      instructions: data.instructions || 'Answer all questions within the allocated examination window.',
      status: 'draft',
      createdBy: data.createdBy || 'Principal Dr. Mrs. Alabi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.assessments.unshift(newAssessment);
    return newAssessment;
  }

  public async publishAssessment(id: string): Promise<Assessment> {
    const assessment = this.assessments.find((a) => a.id === id);
    if (!assessment) {
      throw new Error(`Assessment ${id} not found`);
    }

    assessment.status = 'active';
    assessment.updatedAt = new Date().toISOString();

    // Emit event
    const eventBus = EventBus.getInstance();
    await eventBus.publish<CbtAssessmentPublishedPayload>(
      AppEvents.CBT_ASSESSMENT_PUBLISHED,
      {
        assessmentId: assessment.id,
        title: assessment.title,
        subject: assessment.subject,
        classLevel: assessment.classLevel,
        durationMinutes: assessment.durationMinutes,
        totalMarks: assessment.totalMarks,
        publishedBy: assessment.createdBy,
      },
      { source: 'cbt.service' }
    );

    return assessment;
  }

  // ==========================================
  // Student Test Taker Engine
  // ==========================================

  public async startSession(dto: StartSessionDTO): Promise<{
    session: AssessmentSession;
    assessment: Assessment;
    timeRemainingSeconds: number;
  }> {
    const assessment = await this.getAssessmentById(dto.assessmentId, true);
    if (!assessment) {
      throw new Error(`Assessment ${dto.assessmentId} not found`);
    }

    // Check for existing in_progress session
    let session = this.sessions.find(
      (s) => s.assessmentId === dto.assessmentId && s.studentId === dto.studentId && s.status === 'in_progress'
    );

    if (!session) {
      session = {
        id: crypto.randomUUID(),
        assessmentId: dto.assessmentId,
        studentId: dto.studentId,
        studentName: dto.studentName,
        studentClass: dto.studentClass,
        admissionNo: dto.admissionNo || 'OAK/2026/CBT',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        scoreObtained: 0,
        percentage: 0,
        passed: false,
        tabSwitchCount: 0,
        antiCheatFlags: [],
        ipAddress: '127.0.0.1',
      };
      this.sessions.unshift(session);
    }

    // Calculate time remaining
    const startTime = new Date(session.startedAt).getTime();
    const totalDurationSeconds = assessment.durationMinutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const timeRemainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    if (timeRemainingSeconds <= 0 && session.status === 'in_progress') {
      // Auto-submit if timed out
      await this.submitSession(session.id);
      session.status = 'timed_out';
    }

    // Prepare questions (optionally shuffled)
    let questions = assessment.questions || [];
    if (assessment.shuffleQuestions) {
      questions = [...questions].sort(() => 0.5 - Math.random());
    }

    return {
      session,
      assessment: {
        ...assessment,
        questions,
      },
      timeRemainingSeconds,
    };
  }

  public async submitAnswer(sessionId: string, dto: SubmitAnswerDTO): Promise<SessionAnswer> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (session.status !== 'in_progress') {
      throw new Error(`Cannot submit answer. Session is ${session.status}`);
    }

    let existingAnswer = this.sessionAnswers.find(
      (ans) => ans.sessionId === sessionId && ans.questionId === dto.questionId
    );

    if (existingAnswer) {
      existingAnswer.studentAnswer = dto.studentAnswer;
      existingAnswer.answeredAt = new Date().toISOString();
      return existingAnswer;
    }

    const newAnswer: SessionAnswer = {
      id: crypto.randomUUID(),
      sessionId,
      questionId: dto.questionId,
      studentAnswer: dto.studentAnswer,
      isCorrect: false, // Computed upon submission
      marksAwarded: 0,
      answeredAt: new Date().toISOString(),
    };

    this.sessionAnswers.push(newAnswer);
    return newAnswer;
  }

  public async recordAntiCheatInfraction(
    sessionId: string,
    event: AntiCheatEventDTO
  ): Promise<{
    tabSwitchCount: number;
    maxTabSwitches: number;
    terminated: boolean;
    message: string;
  }> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const assessment = this.assessments.find((a) => a.id === session.assessmentId);
    const maxSwitches = assessment ? assessment.maxTabSwitches : 3;

    session.tabSwitchCount += 1;
    session.antiCheatFlags.push({
      type: event.flagType,
      timestamp: new Date().toISOString(),
      details: event.details || `Focus loss recorded: ${event.flagType}`,
    });

    const isTerminated = session.tabSwitchCount >= maxSwitches;

    if (isTerminated && session.status === 'in_progress') {
      session.status = 'terminated_anti_cheat';
      // Auto-grade whatever was answered so far
      await this.submitSession(sessionId, true);

      // Emit alert
      const eventBus = EventBus.getInstance();
      await eventBus.publish<CbtAntiCheatFlaggedPayload>(
        AppEvents.CBT_ANTI_CHEAT_FLAGGED,
        {
          sessionId: session.id,
          assessmentId: session.assessmentId,
          studentId: session.studentId,
          studentName: session.studentName,
          flagType: event.flagType,
          tabSwitchCount: session.tabSwitchCount,
          maxTabSwitches: maxSwitches,
          autoTerminated: true,
          timestamp: new Date().toISOString(),
        },
        { source: 'cbt.service' }
      );
    }

    return {
      tabSwitchCount: session.tabSwitchCount,
      maxTabSwitches: maxSwitches,
      terminated: isTerminated,
      message: isTerminated
        ? `Anti-cheat limit exceeded (${session.tabSwitchCount}/${maxSwitches}). Examination automatically terminated.`
        : `Warning: Anti-cheat trigger recorded (${session.tabSwitchCount}/${maxSwitches}). Keep test window in full focus.`,
    };
  }

  public async submitSession(
    sessionId: string,
    isForcedTermination = false
  ): Promise<AssessmentSession> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const assessment = this.assessments.find((a) => a.id === session.assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${session.assessmentId} not found`);
    }

    // Evaluate answers
    const studentAnswers = this.sessionAnswers.filter((ans) => ans.sessionId === sessionId);
    let totalScoreObtained = 0;

    for (const ans of studentAnswers) {
      const q = this.questions.find((item) => item.id === ans.questionId);
      if (q) {
        const isMatch = q.correctAnswer.trim().toLowerCase() === ans.studentAnswer.trim().toLowerCase();
        ans.isCorrect = isMatch;
        ans.marksAwarded = isMatch ? q.marks : 0;
        totalScoreObtained += ans.marksAwarded;
      }
    }

    const totalMarks = assessment.totalMarks > 0 ? assessment.totalMarks : 20;
    const percentage = Number(((totalScoreObtained / totalMarks) * 100).toFixed(1));
    const passed = percentage >= assessment.passPercentage;

    const startedTime = new Date(session.startedAt).getTime();
    const durationSeconds = Math.floor((Date.now() - startedTime) / 1000);

    session.submittedAt = new Date().toISOString();
    session.durationSeconds = durationSeconds;
    session.scoreObtained = totalScoreObtained;
    session.percentage = percentage;
    session.passed = passed;
    session.status = isForcedTermination ? 'terminated_anti_cheat' : 'submitted';

    // Emit result event
    const eventBus = EventBus.getInstance();
    await eventBus.publish<CbtSessionSubmittedPayload>(
      AppEvents.CBT_SESSION_SUBMITTED,
      {
        sessionId: session.id,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        subject: assessment.subject,
        studentId: session.studentId,
        studentName: session.studentName,
        studentClass: session.studentClass,
        admissionNo: session.admissionNo,
        scoreObtained: session.scoreObtained,
        totalMarks: assessment.totalMarks,
        percentage: session.percentage,
        passed: session.passed,
        parentEmail: 'guardian@oaklandschools.edu.ng',
        parentPhone: '+2348030000000',
      },
      { source: 'cbt.service' }
    );

    return session;
  }

  public async getSessionResult(sessionId: string): Promise<{
    session: AssessmentSession;
    assessment: Assessment;
    answers: (SessionAnswer & { question: Question })[];
  }> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const assessment = this.assessments.find((a) => a.id === session.assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found`);
    }

    const answers = this.sessionAnswers
      .filter((ans) => ans.sessionId === sessionId)
      .map((ans) => {
        const question = this.questions.find((q) => q.id === ans.questionId)!;
        return {
          ...ans,
          question,
        };
      });

    return {
      session,
      assessment,
      answers,
    };
  }

  // ==========================================
  // Assessment Analytics & Candidate Breakdown
  // ==========================================

  public async getAssessmentAnalytics(assessmentId: string): Promise<CbtAnalytics> {
    const assessment = this.assessments.find((a) => a.id === assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    const sessions = this.sessions.filter((s) => s.assessmentId === assessmentId);
    const submittedSessions = sessions.filter((s) => s.status === 'submitted' || s.status === 'terminated_anti_cheat');

    const totalCandidates = sessions.length;
    const submittedCount = submittedSessions.length;

    let averageScore = 0;
    let averagePercentage = 0;
    let passRate = 0;
    let highestScore = 0;
    let lowestScore = assessment.totalMarks;

    if (submittedCount > 0) {
      const sumScores = submittedSessions.reduce((acc, s) => acc + s.scoreObtained, 0);
      const sumPercentages = submittedSessions.reduce((acc, s) => acc + s.percentage, 0);
      const passedCount = submittedSessions.filter((s) => s.passed).length;

      averageScore = Number((sumScores / submittedCount).toFixed(1));
      averagePercentage = Number((sumPercentages / submittedCount).toFixed(1));
      passRate = Number(((passedCount / submittedCount) * 100).toFixed(1));

      highestScore = Math.max(...submittedSessions.map((s) => s.scoreObtained));
      lowestScore = Math.min(...submittedSessions.map((s) => s.scoreObtained));
    } else {
      lowestScore = 0;
    }

    // Question difficulty metrics
    const questionBreakdown: QuestionDifficultyMetric[] = (assessment.questions || this.questions.filter((q) => q.bankId === 'b0000000-0000-0000-0000-000000000001')).map(
      (q) => {
        const attempts = this.sessionAnswers.filter((a) => a.questionId === q.id);
        const correctAttempts = attempts.filter((a) => a.isCorrect).length;
        const totalAttempts = attempts.length;
        const successRate = totalAttempts > 0 ? Number(((correctAttempts / totalAttempts) * 100).toFixed(1)) : 100;

        return {
          questionId: q.id,
          questionText: q.questionText,
          totalAttempts,
          correctAttempts,
          successRate,
        };
      }
    );

    return {
      assessmentId,
      title: assessment.title,
      totalCandidates,
      submittedCount,
      averageScore,
      averagePercentage,
      passRate,
      highestScore,
      lowestScore,
      questionBreakdown,
    };
  }

  public async getStudentSessions(studentId: string): Promise<AssessmentSession[]> {
    return this.sessions.filter((s) => s.studentId === studentId);
  }
}

export const cbtService = CbtService.getInstance();
