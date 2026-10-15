import { Router } from 'express';
import { TimetableController } from './timetable.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();
const controller = new TimetableController();

router.use(authenticate);

// Anyone with TIMETABLE_VIEW can read active master and versions
router.get('/master', requirePermission(Permissions.TIMETABLE_VIEW), controller.getMasterTimetable);
router.get('/versions', requirePermission(Permissions.TIMETABLE_VIEW), controller.getVersions);
router.get('/constraints', requirePermission(Permissions.TIMETABLE_VIEW), controller.getConstraints);

// Principal & Proprietor have TIMETABLE_SOLVE and TIMETABLE_MANAGE
router.post('/solve', requirePermission(Permissions.TIMETABLE_SOLVE), controller.solveTimetable);
router.post('/publish', requirePermission(Permissions.TIMETABLE_MANAGE), controller.publishVersion);

export default router;
