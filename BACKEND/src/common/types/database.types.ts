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
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface AcademicTerm {
  id: string;
  session_id: string;
  school_id: string;
  name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  school_id: string;
  name: string;
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
  marked_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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

export interface FeeStructure {
  id: string;
  school_id: string;
  name: string;
  amount: number;
  term_id?: string;
  class_id?: string;
  due_date?: string;
}

export interface TransactionRecord {
  id: string;
  school_id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  date: string;
  description: string;
  reference?: string;
  created_by?: string;
  created_at: string;
}

export interface StudentDocument {
  id: string;
  school_id: string;
  student_id: string;
  title: string;
  category: 'birth_certificate' | 'medical' | 'academic' | 'passport' | 'other' | string;
  file_url: string;
  file_type: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface StudentBehaviour {
  id: string;
  school_id: string;
  student_id: string;
  type: 'commendation' | 'infraction' | 'warning' | 'suspension' | 'counselling';
  title: string;
  description: string;
  incident_date: string;
  points: number;
  action_taken?: string;
  recorded_by?: string;
  recorded_by_name?: string;
  is_confidential?: boolean;
  created_at: string;
}

export interface StudentTimelineEntry {
  id: string;
  school_id: string;
  student_id: string;
  event_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowDefinition {
  id: string;
  school_id: string;
  code: string;
  name: string;
  description?: string;
  applicable_module: string;
  steps_config: {
    step_number: number;
    step_name: string;
    required_role: UserRole;
  }[];
  is_active: boolean;
  created_at: string;
}

export interface WorkflowInstance {
  id: string;
  school_id: string;
  definition_id: string;
  entity_type: string;
  entity_id: string;
  current_step: number;
  total_steps: number;
  status: 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  initiated_by?: string;
  initiated_by_name?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  instance_id: string;
  step_number: number;
  step_name: string;
  required_role: string;
  action: 'pending' | 'approved' | 'rejected' | 'skipped';
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  comments?: string;
  action_timestamp?: string;
  created_at: string;
}

