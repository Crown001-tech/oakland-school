import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

// Test & manual email trigger (dispatches via EventBus)
router.post('/test-parent-email', NotificationController.sendTestEmail);

// Event-Driven Architecture Pipeline Endpoints
router.post('/events/publish', authenticate, requirePermission(Permissions.NOTIFICATIONS_SEND), NotificationController.publishEvent);
router.get('/events/stats', authenticate, requirePermission(Permissions.AUDIT_LOGS_VIEW), NotificationController.getEventStats);
router.get('/audit/logs', authenticate, requirePermission(Permissions.AUDIT_LOGS_VIEW), NotificationController.getAuditLogs);
router.post('/events/retry/:eventId', authenticate, requirePermission(Permissions.NOTIFICATIONS_SEND), NotificationController.retryEvent);

export default router;
