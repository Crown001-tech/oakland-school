/**
 * Oakland International School - Granular Role-Based Access Control (RBAC) Taxonomy
 * 
 * Defines granular permission keys across all institutional subsystems.
 * Governs API route access, controller execution, and UI capability rendering.
 */

import { UserRole } from './database.types.js';

export const Permissions = {
  // Students & SIS
  STUDENTS_VIEW: 'students:view',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_DELETE: 'students:delete',
  STUDENTS_STATUS_UPDATE: 'students:status:update',

  // Attendance
  ATTENDANCE_VIEW: 'attendance:view',
  ATTENDANCE_MARK: 'attendance:mark',

  // Scores & Academic Grading
  SCORES_VIEW: 'scores:view',
  SCORES_RECORD: 'scores:record',
  SCORES_APPROVE: 'scores:approve',

  // Results & Report Cards
  RESULTS_VIEW: 'results:view',
  RESULTS_REVIEW: 'results:review',
  RESULTS_APPROVE: 'results:approve',
  RESULTS_PUBLISH: 'results:publish',

  // Academics (Classes, Subjects, Assignments)
  ACADEMICS_CLASSES_VIEW: 'academics:classes:view',
  ACADEMICS_CLASSES_MANAGE: 'academics:classes:manage',
  ACADEMICS_SUBJECTS_VIEW: 'academics:subjects:view',
  ACADEMICS_SUBJECTS_MANAGE: 'academics:subjects:manage',
  ACADEMICS_ASSIGN_TEACHER: 'academics:assign_teacher',

  // Staff Management
  STAFF_VIEW: 'staff:view',
  STAFF_ONBOARD: 'staff:onboard',
  STAFF_APPOINT_PRINCIPAL: 'staff:appoint:principal',
  STAFF_APPOINT_BURSAR: 'staff:appoint:bursar',
  STAFF_TERMINATE: 'staff:terminate',
  STAFF_LEAVE_APPLY: 'staff:leave:apply',
  STAFF_LEAVE_REVIEW: 'staff:leave:review',

  // Finance & Bursary (Executive Proprietor & Bursar strictly)
  FINANCE_OVERVIEW_VIEW: 'finance:overview:view',
  FINANCE_PAYMENTS_RECORD: 'finance:payments:record',
  FINANCE_TRANSACTIONS_RECORD: 'finance:transactions:record',
  FINANCE_REPORTS_VIEW: 'finance:reports:view',

  // Admissions
  ADMISSIONS_VIEW: 'admissions:view',
  ADMISSIONS_REVIEW: 'admissions:review',
  ADMISSIONS_STATUS_UPDATE: 'admissions:status:update',

  // Communications & Notifications
  COMMUNICATIONS_VIEW: 'communications:view',
  COMMUNICATIONS_SEND: 'communications:send',
  COMMUNICATIONS_TEMPLATES_MANAGE: 'communications:templates:manage',
  COMMUNICATIONS_CHANNELS_MANAGE: 'communications:channels:manage',
  COMMUNICATIONS_BROADCAST_STAFF: 'communications:broadcast:staff',
  COMMUNICATIONS_OFFICIAL_LETTERS: 'communications:official_letters',
  NOTIFICATIONS_VIEW: 'notifications:view',
  NOTIFICATIONS_SEND: 'notifications:send',

  // Calendar & Scheduling
  CALENDAR_VIEW: 'calendar:view',
  CALENDAR_MANAGE: 'calendar:manage',

  // Document Centre
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_MANAGE: 'documents:manage',

  // Timetable & Academic Scheduling
  TIMETABLE_VIEW: 'timetable:view',
  TIMETABLE_MANAGE: 'timetable:manage',
  TIMETABLE_SOLVE: 'timetable:solve',

  // Gate Security & Student Pickup
  PICKUP_VIEW: 'pickup:view',
  PICKUP_VERIFY: 'pickup:verify',
  PICKUP_MANAGE: 'pickup:manage',

  // Procurement & Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_MANAGE: 'inventory:manage',
  PROCUREMENT_VIEW: 'procurement:view',
  PROCUREMENT_REQUEST: 'procurement:request',
  PROCUREMENT_APPROVE: 'procurement:approve',

  // Computer-Based Testing (CBT) Engine
  CBT_VIEW: 'cbt:view',
  CBT_MANAGE: 'cbt:manage',
  CBT_TAKE: 'cbt:take',
  CBT_GRADE: 'cbt:grade',

  // System & Audit
  AUDIT_LOGS_VIEW: 'audit:logs:view',
  SYSTEM_SETTINGS_MANAGE: 'system:settings:manage',
} as const;

export type PermissionCode = typeof Permissions[keyof typeof Permissions];

/**
 * Standard baseline permissions mapped to institutional roles.
 * Note:
 * - Proprietor has full executive control.
 * - Admin (Principal) oversees academics, teachers, students, letters, and results,
 *   but has NO access to appoint the Bursar or tamper with Bursar financial vouchers.
 * - Bursar has exclusive financial accounting rights reporting to Proprietor.
 * - Teacher has instructional, score-recording, and class attendance rights.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  proprietor: [
    // Executive Proprietor has all permissions
    Permissions.STUDENTS_VIEW,
    Permissions.STUDENTS_CREATE,
    Permissions.STUDENTS_UPDATE,
    Permissions.STUDENTS_DELETE,
    Permissions.STUDENTS_STATUS_UPDATE,
    Permissions.ATTENDANCE_VIEW,
    Permissions.ATTENDANCE_MARK,
    Permissions.SCORES_VIEW,
    Permissions.SCORES_RECORD,
    Permissions.SCORES_APPROVE,
    Permissions.RESULTS_VIEW,
    Permissions.RESULTS_REVIEW,
    Permissions.RESULTS_APPROVE,
    Permissions.RESULTS_PUBLISH,
    Permissions.ACADEMICS_CLASSES_VIEW,
    Permissions.ACADEMICS_CLASSES_MANAGE,
    Permissions.ACADEMICS_SUBJECTS_VIEW,
    Permissions.ACADEMICS_SUBJECTS_MANAGE,
    Permissions.ACADEMICS_ASSIGN_TEACHER,
    Permissions.STAFF_VIEW,
    Permissions.STAFF_ONBOARD,
    Permissions.STAFF_APPOINT_PRINCIPAL,
    Permissions.STAFF_APPOINT_BURSAR,
    Permissions.STAFF_TERMINATE,
    Permissions.STAFF_LEAVE_APPLY,
    Permissions.STAFF_LEAVE_REVIEW,
    Permissions.FINANCE_OVERVIEW_VIEW,
    Permissions.FINANCE_PAYMENTS_RECORD,
    Permissions.FINANCE_TRANSACTIONS_RECORD,
    Permissions.FINANCE_REPORTS_VIEW,
    Permissions.ADMISSIONS_VIEW,
    Permissions.ADMISSIONS_REVIEW,
    Permissions.ADMISSIONS_STATUS_UPDATE,
    Permissions.COMMUNICATIONS_VIEW,
    Permissions.COMMUNICATIONS_SEND,
    Permissions.COMMUNICATIONS_TEMPLATES_MANAGE,
    Permissions.COMMUNICATIONS_CHANNELS_MANAGE,
    Permissions.COMMUNICATIONS_BROADCAST_STAFF,
    Permissions.COMMUNICATIONS_OFFICIAL_LETTERS,
    Permissions.NOTIFICATIONS_VIEW,
    Permissions.NOTIFICATIONS_SEND,
    Permissions.CALENDAR_VIEW,
    Permissions.CALENDAR_MANAGE,
    Permissions.DOCUMENTS_VIEW,
    Permissions.DOCUMENTS_UPLOAD,
    Permissions.DOCUMENTS_MANAGE,
    Permissions.TIMETABLE_VIEW,
    Permissions.TIMETABLE_MANAGE,
    Permissions.TIMETABLE_SOLVE,
    Permissions.PICKUP_VIEW,
    Permissions.PICKUP_VERIFY,
    Permissions.PICKUP_MANAGE,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_MANAGE,
    Permissions.PROCUREMENT_VIEW,
    Permissions.PROCUREMENT_REQUEST,
    Permissions.PROCUREMENT_APPROVE,
    Permissions.CBT_VIEW,
    Permissions.CBT_MANAGE,
    Permissions.CBT_TAKE,
    Permissions.CBT_GRADE,
    Permissions.AUDIT_LOGS_VIEW,
    Permissions.SYSTEM_SETTINGS_MANAGE,
  ],

  admin: [
    // Principal / Admin
    Permissions.STUDENTS_VIEW,
    Permissions.STUDENTS_CREATE,
    Permissions.STUDENTS_UPDATE,
    Permissions.STUDENTS_DELETE,
    Permissions.STUDENTS_STATUS_UPDATE,
    Permissions.ATTENDANCE_VIEW,
    Permissions.ATTENDANCE_MARK,
    Permissions.SCORES_VIEW,
    Permissions.SCORES_RECORD,
    Permissions.SCORES_APPROVE,
    Permissions.RESULTS_VIEW,
    Permissions.RESULTS_REVIEW,
    Permissions.RESULTS_APPROVE,
    Permissions.ACADEMICS_CLASSES_VIEW,
    Permissions.ACADEMICS_CLASSES_MANAGE,
    Permissions.ACADEMICS_SUBJECTS_VIEW,
    Permissions.ACADEMICS_SUBJECTS_MANAGE,
    Permissions.ACADEMICS_ASSIGN_TEACHER,
    Permissions.STAFF_VIEW,
    Permissions.STAFF_ONBOARD,
    Permissions.STAFF_TERMINATE,
    Permissions.STAFF_LEAVE_APPLY,
    Permissions.STAFF_LEAVE_REVIEW,
    Permissions.ADMISSIONS_VIEW,
    Permissions.ADMISSIONS_REVIEW,
    Permissions.ADMISSIONS_STATUS_UPDATE,
    Permissions.COMMUNICATIONS_VIEW,
    Permissions.COMMUNICATIONS_SEND,
    Permissions.COMMUNICATIONS_TEMPLATES_MANAGE,
    Permissions.COMMUNICATIONS_OFFICIAL_LETTERS,
    Permissions.NOTIFICATIONS_VIEW,
    Permissions.NOTIFICATIONS_SEND,
    Permissions.CALENDAR_VIEW,
    Permissions.CALENDAR_MANAGE,
    Permissions.DOCUMENTS_VIEW,
    Permissions.DOCUMENTS_UPLOAD,
    Permissions.DOCUMENTS_MANAGE,
    Permissions.TIMETABLE_VIEW,
    Permissions.TIMETABLE_MANAGE,
    Permissions.TIMETABLE_SOLVE,
    Permissions.PICKUP_VIEW,
    Permissions.PICKUP_VERIFY,
    Permissions.PICKUP_MANAGE,
    Permissions.INVENTORY_VIEW,
    Permissions.INVENTORY_MANAGE,
    Permissions.PROCUREMENT_VIEW,
    Permissions.PROCUREMENT_REQUEST,
    Permissions.PROCUREMENT_APPROVE,
    Permissions.CBT_VIEW,
    Permissions.CBT_MANAGE,
    Permissions.CBT_TAKE,
    Permissions.CBT_GRADE,
    Permissions.AUDIT_LOGS_VIEW,
  ],

  bursar: [
    // Bursar (Controlled directly by Proprietor)
    Permissions.STUDENTS_VIEW,
    Permissions.FINANCE_OVERVIEW_VIEW,
    Permissions.FINANCE_PAYMENTS_RECORD,
    Permissions.FINANCE_TRANSACTIONS_RECORD,
    Permissions.FINANCE_REPORTS_VIEW,
    Permissions.STAFF_LEAVE_APPLY,
    Permissions.NOTIFICATIONS_VIEW,
    Permissions.CALENDAR_VIEW,
    Permissions.DOCUMENTS_VIEW,
    Permissions.DOCUMENTS_UPLOAD,
    Permissions.TIMETABLE_VIEW,
    Permissions.INVENTORY_VIEW,
    Permissions.PROCUREMENT_VIEW,
    Permissions.PROCUREMENT_REQUEST,
  ],

  teacher: [
    // Classroom Teacher
    Permissions.STUDENTS_VIEW,
    Permissions.ATTENDANCE_VIEW,
    Permissions.ATTENDANCE_MARK,
    Permissions.SCORES_VIEW,
    Permissions.SCORES_RECORD,
    Permissions.RESULTS_VIEW,
    Permissions.ACADEMICS_CLASSES_VIEW,
    Permissions.ACADEMICS_SUBJECTS_VIEW,
    Permissions.STAFF_LEAVE_APPLY,
    Permissions.NOTIFICATIONS_VIEW,
    Permissions.CALENDAR_VIEW,
    Permissions.DOCUMENTS_VIEW,
    Permissions.TIMETABLE_VIEW,
    Permissions.PICKUP_VIEW,
    Permissions.PICKUP_VERIFY,
    Permissions.INVENTORY_VIEW,
    Permissions.PROCUREMENT_REQUEST,
    Permissions.CBT_VIEW,
    Permissions.CBT_MANAGE,
    Permissions.CBT_GRADE,
  ],
};
