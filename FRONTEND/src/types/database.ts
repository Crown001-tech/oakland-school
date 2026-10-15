export type UserRole = 'proprietor' | 'admin' | 'teacher' | 'bursar';

export type StudentStatus = 'active' | 'suspended' | 'graduated' | 'transferred' | 'archived';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export type ResultStatus = 'draft' | 'submitted' | 'reviewed' | 'approved' | 'published';

export type AdmissionStatus = 'submitted' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected' | 'enrolled';

export type NotificationStatus = 'pending' | 'sent' | 'retrying' | 'failed';

export interface School {
  id: string;
  name: string;
  code: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SchoolMembership {
  id: string;
  school_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  user_id: string;
  school_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  qualification?: string;
  is_active: boolean;
  created_at: string;
}

export interface AcademicSession {
  id: string;
  school_id: string;
  name: string; // e.g. "2026/2027"
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface AcademicTerm {
  id: string;
  session_id: string;
  school_id: string;
  name: string; // e.g. "First Term"
  term_number: number; // 1, 2, 3
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  school_id: string;
  name: 'JSS 1' | 'JSS 2' | 'JSS 3' | 'SS 1' | 'SS 2' | 'SS 3' | string;
  grade_level: number;
  capacity: number;
  class_teacher_id?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string;
  category?: string;
  is_active: boolean;
  created_at: string;
}

export interface TeacherAssignment {
  id: string;
  school_id: string;
  staff_id: string;
  class_id: string;
  subject_id?: string;
  session_id: string;
  is_class_teacher: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  blood_group?: string;
  address?: string;
  photo_url?: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface Guardian {
  id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alt_phone?: string;
  relationship: string; // Father, Mother, Sponsor, etc.
  occupation?: string;
  address?: string;
  created_at: string;
}

export interface StudentGuardian {
  id: string;
  student_id: string;
  guardian_id: string;
  relationship: string;
  is_primary: boolean;
  can_receive_reports: boolean;
  created_at: string;
}

export interface ClassEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  session_id: string;
  roll_number?: string;
  status: 'active' | 'promoted' | 'repeated' | 'withdrawn';
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  class_id: string;
  student_id: string;
  session_id: string;
  term_id: string;
  date: string;
  status: AttendanceStatus;
  check_in_time?: string;
  check_out_time?: string;
  late_reason?: string;
  marked_by: string; // user_id
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentCategory {
  id: string;
  school_id: string;
  name: string; // e.g. "Continuous Assessment 1", "Term Exam"
  weight_percentage: number; // e.g. 20, 60
  term_id?: string;
  created_at: string;
}

export interface Assessment {
  id: string;
  school_id: string;
  subject_id: string;
  class_id: string;
  term_id: string;
  category_id: string;
  title: string;
  max_score: number;
  created_at: string;
}

export interface Score {
  id: string;
  assessment_id: string;
  enrollment_id: string;
  score: number;
  status: ResultStatus;
  graded_by: string;
  approved_by?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface GradingScale {
  id: string;
  school_id: string;
  grade: string; // e.g. "A+", "A", "B", "C", "F"
  min_score: number;
  max_score: number;
  gpa_point?: number;
  remark: string; // e.g. "Excellent", "Credit", "Fail"
  created_at: string;
}

export interface ReportCard {
  id: string;
  enrollment_id: string;
  term_id: string;
  total_score: number;
  average_score: number;
  rank?: number;
  attendance_present: number;
  attendance_total: number;
  principal_comment?: string;
  teacher_comment?: string;
  pdf_url?: string;
  status: 'draft' | 'approved' | 'published';
  access_token: string;
  published_at?: string;
  created_at: string;
}

export interface AdmissionApplication {
  id: string;
  school_id: string;
  reference_number: string;
  applicant_first_name: string;
  applicant_last_name: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  applying_for_class: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  status: AdmissionStatus;
  documents?: { title: string; url: string }[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  school_id: string;
  recipient_email: string;
  recipient_name: string;
  notification_type: 'attendance_checkin' | 'attendance_late' | 'attendance_absent' | 'attendance_checkout' | 'report_card_ready' | 'admission_update';
  subject: string;
  content_html: string;
  status: NotificationStatus;
  idempotency_key: string;
  attempts_count: number;
  last_attempt_at?: string;
  error_message?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  school_id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}
