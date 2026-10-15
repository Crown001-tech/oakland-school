/**
 * Oakland International School - Domain Event Contracts
 * Defines all strongly-typed asynchronous events emitted across the institution.
 */

export enum AppEvents {
  // Staff & Appointment Lifecycle
  STAFF_APPOINTED = 'staff.appointed',
  STAFF_ONBOARDED = 'staff.onboarded',
  STAFF_TERMINATED = 'staff.terminated',

  // Attendance & Student Welfare
  STUDENT_ABSENT_MARKED = 'student.absent.marked',
  STUDENT_LATE_MARKED = 'student.late.marked',

  // Academic Results & Report Cards
  REPORT_CARD_REVIEWED = 'report_card.reviewed',
  REPORT_CARD_PUBLISHED = 'report_card.published',

  // Institutional Communications
  STAFF_BROADCAST_CREATED = 'staff.broadcast.created',
  OFFICIAL_LETTER_ISSUED = 'official_letter.issued',

  // Faculty Leave Governance
  LEAVE_REQUESTED = 'leave.requested',
  LEAVE_STATUS_CHANGED = 'leave.status_changed',

  // Bursary & Treasury
  FEE_PAYMENT_RECORDED = 'fee.payment_recorded',
  EXPENDITURE_VOUCHER_APPROVED = 'expenditure.voucher_approved',

  // Calendar & Operational Scheduling
  CALENDAR_EVENT_SCHEDULED = 'calendar.event_scheduled',
  CALENDAR_EVENT_REMINDER = 'calendar.event_reminder',

  // Document Registry
  DOCUMENT_UPLOADED = 'document.uploaded',

  // Timetable Operations
  TIMETABLE_VERSION_PUBLISHED = 'timetable.version_published',

  // Gate Security & Student Pickup
  STUDENT_PICKUP_RECORDED = 'student.pickup_recorded',
  SECURITY_PICKUP_FLAGGED = 'security.pickup_flagged',

  // Procurement & Inventory Governance
  PROCUREMENT_REQUEST_SUBMITTED = 'procurement.request_submitted',
  PROCUREMENT_STATUS_CHANGED = 'procurement.status_changed',

  // Computer-Based Testing (CBT) Engine
  CBT_ASSESSMENT_PUBLISHED = 'cbt.assessment_published',
  CBT_SESSION_SUBMITTED = 'cbt.session_submitted',
  CBT_ANTI_CHEAT_FLAGGED = 'cbt.anti_cheat_flagged',
}

export interface BaseEventMeta {
  eventId: string;
  eventName: AppEvents;
  timestamp: string;
  source: string;
  correlationId?: string;
  retryCount?: number;
}

export interface AppEvent<T = any> {
  meta: BaseEventMeta;
  payload: T;
}

// ==========================================
// Event Payloads
// ==========================================

export interface StaffAppointedPayload {
  to: string;
  fullName: string;
  role: 'admin' | 'bursar' | 'teacher';
  employeeId: string;
  temporaryPassword?: string;
  appointedBy?: string;
  loginUrl?: string;
}

export interface StudentAbsentPayload {
  studentId: string;
  studentName: string;
  studentClass: string;
  date: string;
  parentEmail?: string;
  parentName?: string;
  guardianPhone?: string;
  markedBy?: string;
}

export interface ReportCardPublishedPayload {
  studentId: string;
  studentName: string;
  studentClass: string;
  term: string;
  academicYear: string;
  parentEmail: string;
  parentName?: string;
  totalScore?: number;
  percentage?: number;
  position?: string;
  portalUrl?: string;
  approvedBy?: string;
}

export interface StaffBroadcastPayload {
  broadcastId: string;
  title: string;
  message: string;
  audience: 'All Staff' | 'Teaching Faculty' | 'Administrative Leadership' | 'Bursary & Accounts';
  priority: 'General Announcement' | 'Important Notice' | 'Executive Direct Mandate';
  channels: string[];
  senderName: string;
  targetEmails: string[];
}

export interface LeaveStatusChangedPayload {
  leaveId: string;
  staffName: string;
  staffEmail: string;
  role: string;
  status: 'Approved' | 'Rejected' | 'Pending Principal' | 'Pending Proprietor';
  days: number;
  startDate: string;
  endDate: string;
  reviewerName?: string;
  remarks?: string;
}

export interface FeePaymentRecordedPayload {
  paymentId: string;
  studentName: string;
  studentClass: string;
  amount: number;
  receiptNo: string;
  paymentMethod: string;
  payerName: string;
  payerEmail?: string;
  recordedBy: string;
  date: string;
}

export interface CalendarEventPayload {
  eventId: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  audience: string;
  location?: string;
  targetClass?: string;
  description?: string;
}

export interface DocumentUploadedPayload {
  documentId: string;
  title: string;
  documentType: string;
  fileUrl: string;
  associatedStudentId?: string;
  associatedStaffId?: string;
}

export interface TimetablePublishedPayload {
  versionId: string;
  academicYear: string;
  term: string;
  conflictCount: number;
  satisfactionScore: number;
  publishedBy?: string;
}

export interface StudentPickupPayload {
  logId: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  pickedUpBy: string;
  relationship: string;
  verifiedBy: string;
  pickupTime: string;
  parentPhone?: string;
  parentEmail?: string;
}

export interface SecurityPickupFlaggedPayload {
  logId: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  attemptedBy: string;
  reason: string;
  gateOfficer: string;
  timestamp: string;
}

export interface ProcurementRequestPayload {
  requestId: string;
  itemName: string;
  category: string;
  quantity: number;
  totalCost: number;
  requestedBy: string;
  urgency: string;
  status: string;
}

export interface CbtAssessmentPublishedPayload {
  assessmentId: string;
  title: string;
  subject: string;
  classLevel: string;
  durationMinutes: number;
  totalMarks: number;
  publishedBy: string;
  scheduledStart?: string;
}

export interface CbtSessionSubmittedPayload {
  sessionId: string;
  assessmentId: string;
  assessmentTitle: string;
  subject: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  admissionNo?: string;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  parentEmail?: string;
  parentPhone?: string;
}

export interface CbtAntiCheatFlaggedPayload {
  sessionId: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  flagType: string;
  tabSwitchCount: number;
  maxTabSwitches: number;
  autoTerminated: boolean;
  timestamp: string;
}


