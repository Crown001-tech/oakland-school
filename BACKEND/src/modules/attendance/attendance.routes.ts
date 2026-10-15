import { Router } from 'express';
import { AttendanceController } from './attendance.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

router.use(authenticate);

router.get('/class/:classId', requirePermission(Permissions.ATTENDANCE_VIEW), AttendanceController.getClassAttendance);
router.post('/mark', requirePermission(Permissions.ATTENDANCE_MARK), AttendanceController.markBatch);
router.get('/student/:studentId', requirePermission(Permissions.ATTENDANCE_VIEW), AttendanceController.getStudentSummary);

export default router;
