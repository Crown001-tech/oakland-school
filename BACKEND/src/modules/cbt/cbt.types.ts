/**
 * Oakland International School - Computer-Based Testing (CBT) Types
 */

export type QuestionType = 'mcq' | 'true_false' | 'short_answer';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type AssessmentStatus = 'draft' | 'scheduled' | 'published' | 'active' | 'closed';
export type SessionStatus = 'in_progress' | 'submitted' | 'terminated_anti_cheat' | 'timed_out';

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D" or "True", "False"
  text: string;
}

export interface Question {
  id: string;
  bankId: string;
  questionText: string;
  questionType: QuestionType;
  options: QuestionOption[];
  correctAnswer: string;
  explanation?: string;
  marks: number;
  difficulty: QuestionDifficulty;
  createdAt: string;
}

export interface QuestionBank {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  description?: string;
  createdBy: string;
  questionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestion {
  questionId: string;
  orderIndex: number;
  marks: number;
  question?: Question;
}

export interface Assessment {
  id: string;
  title: string;
  code: string;
  subject: string;
  classLevel: string;
  term: string;
  academicYear: string;
  durationMinutes: number;
  totalMarks: number;
  passPercentage: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxTabSwitches: number;
  instructions: string;
  status: AssessmentStatus;
  scheduledStart?: string;
  scheduledEnd?: string;
  createdBy: string;
  questions?: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface AntiCheatFlag {
  type: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'copy_paste_attempt';
  timestamp: string;
  details?: string;
}

export interface AssessmentSession {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  admissionNo?: string;
  status: SessionStatus;
  startedAt: string;
  submittedAt?: string;
  durationSeconds: number;
  scoreObtained: number;
  percentage: number;
  passed: boolean;
  tabSwitchCount: number;
  antiCheatFlags: AntiCheatFlag[];
  ipAddress?: string;
}

export interface SessionAnswer {
  id: string;
  sessionId: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  answeredAt: string;
}

export interface StartSessionDTO {
  assessmentId: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  admissionNo?: string;
}

export interface SubmitAnswerDTO {
  questionId: string;
  studentAnswer: string;
}

export interface AntiCheatEventDTO {
  flagType: AntiCheatFlag['type'];
  details?: string;
}

export interface QuestionDifficultyMetric {
  questionId: string;
  questionText: string;
  totalAttempts: number;
  correctAttempts: number;
  successRate: number;
}

export interface CbtAnalytics {
  assessmentId: string;
  title: string;
  totalCandidates: number;
  submittedCount: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  questionBreakdown: QuestionDifficultyMetric[];
}
