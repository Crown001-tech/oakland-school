import { Router } from 'express';
import { CbtController } from './cbt.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

router.use(authenticate);

// ==========================================
// Question Banks & Questions
// ==========================================
router.get(
  '/question-banks',
  requirePermission(Permissions.CBT_VIEW),
  CbtController.getQuestionBanks
);

router.post(
  '/question-banks',
  requirePermission(Permissions.CBT_MANAGE),
  CbtController.createQuestionBank
);

router.get(
  '/question-banks/:bankId/questions',
  requirePermission(Permissions.CBT_VIEW),
  CbtController.getQuestionsByBank
);

router.post(
  '/question-banks/:bankId/questions',
  requirePermission(Permissions.CBT_MANAGE),
  CbtController.addQuestion
);

// ==========================================
// Assessment Builder & Management
// ==========================================
router.get(
  '/assessments',
  requirePermission(Permissions.CBT_VIEW),
  CbtController.getAssessments
);

router.get(
  '/assessments/:id',
  requirePermission(Permissions.CBT_VIEW),
  CbtController.getAssessmentById
);

router.post(
  '/assessments',
  requirePermission(Permissions.CBT_MANAGE),
  CbtController.createAssessment
);

router.patch(
  '/assessments/:id/publish',
  requirePermission(Permissions.CBT_MANAGE),
  CbtController.publishAssessment
);

router.get(
  '/assessments/:id/analytics',
  requirePermission(Permissions.CBT_VIEW),
  CbtController.getAssessmentAnalytics
);

// ==========================================
// Candidate Test Taker Engine
// ==========================================
router.post(
  '/sessions/start',
  requirePermission(Permissions.CBT_TAKE),
  CbtController.startSession
);

router.post(
  '/sessions/:sessionId/answer',
  requirePermission(Permissions.CBT_TAKE),
  CbtController.submitAnswer
);

router.post(
  '/sessions/:sessionId/anti-cheat',
  requirePermission(Permissions.CBT_TAKE),
  CbtController.recordAntiCheat
);

router.post(
  '/sessions/:sessionId/submit',
  requirePermission(Permissions.CBT_TAKE),
  CbtController.submitSession
);

router.get(
  '/sessions/:sessionId/result',
  requirePermission(Permissions.CBT_TAKE),
  CbtController.getSessionResult
);

router.get(
  '/sessions/student/:studentId',
  requirePermission(Permissions.CBT_TAKE),
  CbtController.getStudentSessions
);

export default router;
