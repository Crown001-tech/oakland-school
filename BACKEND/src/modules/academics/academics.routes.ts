import { Router } from 'express';
import { AcademicsController } from './academics.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

router.use(authenticate);

router.get('/calendar', requirePermission(Permissions.ACADEMICS_CLASSES_VIEW), AcademicsController.getCalendar);
router.get('/classes', requirePermission(Permissions.ACADEMICS_CLASSES_VIEW), AcademicsController.getClasses);
router.post('/classes', requirePermission(Permissions.ACADEMICS_CLASSES_MANAGE), AcademicsController.createClass);
router.get('/subjects', requirePermission(Permissions.ACADEMICS_SUBJECTS_VIEW), AcademicsController.getSubjects);
router.post('/subjects/sync', requirePermission(Permissions.ACADEMICS_CLASSES_MANAGE), AcademicsController.syncSubjects);
router.post('/assign-teacher', requirePermission(Permissions.ACADEMICS_ASSIGN_TEACHER), AcademicsController.assignTeacher);

export default router;
