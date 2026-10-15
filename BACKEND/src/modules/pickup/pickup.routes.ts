import { Router } from 'express';
import { PickupController } from './pickup.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();
const controller = new PickupController();

router.use(authenticate);

// Verification and lookup
router.get('/lookup', requirePermission(Permissions.PICKUP_VIEW), controller.lookupQR);
router.get('/student/:studentId', requirePermission(Permissions.PICKUP_VIEW), controller.getAuthorizedPersons);
router.get('/logs', requirePermission(Permissions.PICKUP_VIEW), controller.getRecentLogs);

// Verify and clear student departure
router.post('/verify-and-clear', requirePermission(Permissions.PICKUP_VERIFY), controller.recordPickup);
router.post('/flag-alert', requirePermission(Permissions.PICKUP_VERIFY), controller.flagAlert);

// Parent/Admin registration of authorized escorts
router.post('/register-authorized', requirePermission(Permissions.PICKUP_MANAGE), controller.registerAuthorized);

export default router;
