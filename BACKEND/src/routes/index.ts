import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import studentsRoutes from '../modules/students/students.routes.js';
import academicsRoutes from '../modules/academics/academics.routes.js';
import attendanceRoutes from '../modules/attendance/attendance.routes.js';
import scoresRoutes from '../modules/scores/scores.routes.js';
import financeRoutes from '../modules/finance/finance.routes.js';
import staffRoutes from '../modules/staff/staff.routes.js';
import admissionsRoutes from '../modules/admissions/admissions.routes.js';
import notificationRoutes from '../modules/notifications/notification.routes.js';
import communicationRoutes from '../modules/communications/communication.routes.js';
import calendarRoutes from '../modules/calendar/calendar.routes.js';
import documentsRoutes from '../modules/documents/document.routes.js';
import timetableRoutes from '../modules/timetable/timetable.routes.js';
import pickupRoutes from '../modules/pickup/pickup.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import cbtRoutes from '../modules/cbt/cbt.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Oakland School API Modular Monolith',
    version: '1.0.0',
  });
});

// Modular Monolith Routes
router.use('/auth', authRoutes);
router.use('/students', studentsRoutes);
router.use('/academics', academicsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/scores', scoresRoutes);
router.use('/finance', financeRoutes);
router.use('/staff', staffRoutes);
router.use('/admissions', admissionsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/communications', communicationRoutes);
router.use('/calendar', calendarRoutes);
router.use('/documents', documentsRoutes);
router.use('/timetable', timetableRoutes);
router.use('/pickup', pickupRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cbt', cbtRoutes);

export default router;
