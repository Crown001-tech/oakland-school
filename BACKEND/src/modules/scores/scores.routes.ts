import { Router } from 'express';
import { ScoresController } from './scores.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

router.use(authenticate);

router.get('/assessments', requirePermission(Permissions.SCORES_VIEW), ScoresController.getAssessments);
router.get('/assessments/:assessmentId/scores', requirePermission(Permissions.SCORES_VIEW), ScoresController.getScoresByAssessment);
router.post('/record', requirePermission(Permissions.SCORES_RECORD), ScoresController.recordScores);
router.get('/report-card/:studentId', requirePermission(Permissions.RESULTS_VIEW), ScoresController.getReportCard);

export default router;
