/**
 * Oakland International School - Communication Centre Routes
 * 
 * Governed by Granular RBAC Permissions:
 * - View telemetries/templates/channels: communications:view
 * - Broadcast dispatches: communications:send
 * - Manage templates: communications:templates:manage
 * - Manage channels: communications:channels:manage
 */

import { Router } from 'express';
import { CommunicationController } from './communication.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

// Authentication middleware applied across communications
router.use(authenticate);

// Telemetry & Metrics
router.get('/stats', requirePermission(Permissions.COMMUNICATIONS_VIEW), CommunicationController.getStats);

// Gateways & Channels
router.get('/channels', requirePermission(Permissions.COMMUNICATIONS_VIEW), CommunicationController.getChannels);
router.patch('/channels/:type', requirePermission(Permissions.COMMUNICATIONS_CHANNELS_MANAGE), CommunicationController.updateChannel);
router.post('/test-channel', requirePermission(Permissions.COMMUNICATIONS_SEND), CommunicationController.testChannel);

// Templates Library
router.get('/templates', requirePermission(Permissions.COMMUNICATIONS_VIEW), CommunicationController.getTemplates);
router.post('/templates', requirePermission(Permissions.COMMUNICATIONS_TEMPLATES_MANAGE), CommunicationController.saveTemplate);

// Audience Estimator
router.post('/audience-count', requirePermission(Permissions.COMMUNICATIONS_VIEW), CommunicationController.getAudienceCount);

// Broadcast Operations
router.post('/broadcast', requirePermission(Permissions.COMMUNICATIONS_SEND), CommunicationController.broadcast);

// Delivery Audit Logs
router.get('/logs', requirePermission(Permissions.COMMUNICATIONS_VIEW), CommunicationController.getLogs);

export default router;
