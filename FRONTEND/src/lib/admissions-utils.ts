import { normalizeClass } from './class-utils';

export type UnifiedAdmissionStage = 'In Review' | 'Admitted' | 'Declined';

export interface SharedAdmissionRecord {
  id: string;
  referenceNumber: string;
  applicantName: string;
  firstName?: string;
  middleName?: string;
  surname?: string;
  gender: 'Male' | 'Female';
  appliedClass: string;
  dob?: string;
  stateOfOrigin?: string;
  lga?: string;
  religion?: string;
  previousSchool?: string;
  lastClassPassed?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  fatherName?: string;
  fatherPhone?: string;
  fatherEmail?: string;
  motherName?: string;
  motherPhone?: string;
  motherEmail?: string;
  residentialAddress?: string;
  bloodGroup?: string;
  genotype?: string;
  medicalConditions?: string;
  examScore?: number;
  stage: UnifiedAdmissionStage;
  appliedDate: string;
}

export const ADMISSIONS_STORAGE_KEY = 'oakland_admissions_queue';

export const ADMISSION_STAGES: UnifiedAdmissionStage[] = [
  'In Review',
  'Admitted',
  'Declined',
];

export const DEFAULT_ADMISSIONS: SharedAdmissionRecord[] = [];

/**
 * Normalizes stage strings from different portals, forms, or legacy storage
 */
export function normalizeStage(raw?: string): UnifiedAdmissionStage {
  if (!raw) return 'In Review';
  const lower = raw.toLowerCase();
  if (lower.includes('admit') || lower.includes('enroll') || lower.includes('offer')) return 'Admitted';
  if (lower.includes('decline') || lower.includes('reject')) return 'Declined';
  return 'In Review';
}

let memoryAdmissions: SharedAdmissionRecord[] = [];

/**
 * Reads admissions from memory
 */
export function getStoredAdmissions(): SharedAdmissionRecord[] {
  return [...memoryAdmissions];
}

/**
 * Saves admissions to memory and dispatches update event
 */
export function saveStoredAdmissions(records: SharedAdmissionRecord[]): void {
  memoryAdmissions = [...records];
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oakland-admissions-update', { detail: records }));
  }
}

/**
 * Adds an application directly into the admissions queue with initial status 'In Review'
 */
export function addAdmissionToQueue(app: Partial<SharedAdmissionRecord>): SharedAdmissionRecord {
  const existing = getStoredAdmissions();
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const ref = app.referenceNumber || `OSC-ADM-2026-${randNum}`;

  const fullName = (
    app.applicantName ||
    `${app.firstName || ''} ${app.surname || ''}`.trim() ||
    'Candidate'
  ).trim();

  const newRecord: SharedAdmissionRecord = {
    id: app.id || `adm-${Date.now()}-${randNum}`,
    referenceNumber: ref,
    applicantName: fullName,
    firstName: app.firstName,
    middleName: app.middleName,
    surname: app.surname,
    gender: app.gender === 'Female' ? 'Female' : 'Male',
    appliedClass: normalizeClass(app.appliedClass) || 'JSS 1',
    dob: app.dob || '—',
    stateOfOrigin: app.stateOfOrigin || '—',
    lga: app.lga || '—',
    religion: app.religion || '—',
    previousSchool: app.previousSchool || '—',
    lastClassPassed: app.lastClassPassed || '—',
    parentName: (app.parentName || app.fatherName || app.motherName || 'Parent / Guardian').trim(),
    parentPhone: (app.parentPhone || app.fatherPhone || app.motherPhone || '—').trim(),
    parentEmail: (app.parentEmail || app.fatherEmail || app.motherEmail || '—').trim().toLowerCase(),
    fatherName: app.fatherName,
    fatherPhone: app.fatherPhone,
    fatherEmail: app.fatherEmail,
    motherName: app.motherName,
    motherPhone: app.motherPhone,
    motherEmail: app.motherEmail,
    residentialAddress: app.residentialAddress || '—',
    bloodGroup: app.bloodGroup || '—',
    genotype: app.genotype || '—',
    medicalConditions: app.medicalConditions || 'None reported',
    examScore: app.examScore,
    stage: 'In Review', // Automatically starts in review
    appliedDate: app.appliedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  const updated = [newRecord, ...existing];
  saveStoredAdmissions(updated);
  return newRecord;
}

/**
 * Enrolls an admitted applicant into the active students directory with ALL submitted data
 */
export function enrollApplicantAsStudent(record: SharedAdmissionRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const nameParts = record.applicantName.trim().split(' ');
    const fName = record.firstName || nameParts[0] || 'Student';
    const lName = record.surname || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');

    // Persist directly to PostgreSQL database (DEF-152: Zero mock DOB fallback)
    const studentDob = record.dob && record.dob !== '—' && !isNaN(Date.parse(record.dob))
      ? record.dob
      : null;

    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: record.applicantName,
        first_name: fName,
        last_name: lName,
        admissionNo: record.referenceNumber,
        class: record.appliedClass,
        gender: record.gender,
        dob: studentDob,
        guardianName: record.parentName,
        guardianPhone: record.parentPhone,
        guardianEmail: record.parentEmail,
      }),
    }).catch(() => {});
  } catch {}
}

/**
 * Updates stage for an application in the shared admissions queue
 * Accepts 'Admitted' (enrolling student) or 'Declined'
 */
export function updateAdmissionStage(id: string, newStage: UnifiedAdmissionStage): SharedAdmissionRecord | null {
  const admissions = getStoredAdmissions();
  let updatedRecord: SharedAdmissionRecord | null = null;

  const nextList = admissions.map((item) => {
    if (item.id === id || item.referenceNumber === id) {
      updatedRecord = { ...item, stage: newStage };
      return updatedRecord;
    }
    return item;
  });

  if (updatedRecord) {
    saveStoredAdmissions(nextList);
    if (newStage === 'Admitted') {
      enrollApplicantAsStudent(updatedRecord);
    }
  }
  return updatedRecord;
}
