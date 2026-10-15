import { Router } from 'express';
import { CalendarController } from './calendar.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();
const controller = new CalendarController();

// All calendar endpoints require authentication
router.use(authenticate);

// Anyone with CALENDAR_VIEW can read events (staff, parents, teachers, bursar, admin, proprietor)
router.get('/events', requirePermission(Permissions.CALENDAR_VIEW), controller.getEvents);
router.get('/events/:id', requirePermission(Permissions.CALENDAR_VIEW), controller.getEventById);

// CALENDAR_MANAGE needed to schedule, modify, delete, and broadcast
router.post('/events', requirePermission(Permissions.CALENDAR_MANAGE), controller.createEvent);
router.patch('/events/:id', requirePermission(Permissions.CALENDAR_MANAGE), controller.updateEvent);
router.delete('/events/:id', requirePermission(Permissions.CALENDAR_MANAGE), controller.deleteEvent);
router.post('/events/:id/notify', requirePermission(Permissions.CALENDAR_MANAGE), controller.broadcastReminder);

export default router;
