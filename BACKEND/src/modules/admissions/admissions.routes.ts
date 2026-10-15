import { Router } from 'express';
import { AdmissionsController } from './admissions.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

// Public submission
router.post('/apply', AdmissionsController.submitPublic);

// Authenticated management
router.get('/', authenticate, requirePermission(Permissions.ADMISSIONS_VIEW), AdmissionsController.list);
router.patch('/:id/status', authenticate, requirePermission(Permissions.ADMISSIONS_STATUS_UPDATE), AdmissionsController.updateStatus);

export default router;
