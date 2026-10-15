import { Router } from 'express';
import { StaffController } from './staff.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(Permissions.STAFF_VIEW), StaffController.list);
router.post('/onboard', requirePermission(Permissions.STAFF_ONBOARD), StaffController.onboard);
router.post('/appoint-principal', requirePermission(Permissions.STAFF_APPOINT_PRINCIPAL), StaffController.appointPrincipal);
router.post('/appoint-bursar', requirePermission(Permissions.STAFF_APPOINT_BURSAR), StaffController.appointBursar);
router.get('/:id', requirePermission(Permissions.STAFF_VIEW), StaffController.getById);
router.delete('/:id', requirePermission(Permissions.STAFF_TERMINATE), StaffController.delete);
router.post('/leave', requirePermission(Permissions.STAFF_LEAVE_APPLY), StaffController.submitLeave);

export default router;
