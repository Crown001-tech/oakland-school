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

/**
 * Reads admissions from localStorage
 */
export function getStoredAdmissions(): SharedAdmissionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMISSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        id: item.id || `adm-${Math.random().toString(36).substring(2, 9)}`,
        referenceNumber: item.referenceNumber || item.refNumber || `OSC-ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        applicantName: item.applicantName || item.candidateName || `${item.firstName || ''} ${item.surname || ''}`.trim() || 'Applicant',
        firstName: item.firstName,
        middleName: item.middleName,
        surname: item.surname,
        gender: item.gender === 'Female' ? 'Female' : 'Male',
        appliedClass: normalizeClass(item.appliedClass || item.targetClass) || 'JSS 1',
        dob: item.dob || item.dateOfBirth || '—',
        stateOfOrigin: item.stateOfOrigin || '—',
        lga: item.lga || '—',
        religion: item.religion || '—',
        previousSchool: item.previousSchool || '—',
        lastClassPassed: item.lastClassPassed || '—',
        parentName: item.parentName || item.guardianName || item.fatherName || item.motherName || 'Parent / Guardian',
        parentPhone: item.parentPhone || item.guardianPhone || item.fatherPhone || item.motherPhone || '—',
        parentEmail: item.parentEmail || item.guardianEmail || item.fatherEmail || item.motherEmail || '—',
        fatherName: item.fatherName,
        fatherPhone: item.fatherPhone,
        fatherEmail: item.fatherEmail,
        motherName: item.motherName,
        motherPhone: item.motherPhone,
        motherEmail: item.motherEmail,
        residentialAddress: item.residentialAddress || item.address || '—',
        bloodGroup: item.bloodGroup || '—',
        genotype: item.genotype || '—',
        medicalConditions: item.medicalConditions || 'None reported',
        examScore: typeof item.examScore === 'number' ? item.examScore : item.entranceExamScore,
        stage: normalizeStage(item.stage),
        appliedDate: item.appliedDate || item.submittedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }));
    }
  } catch {}
  return [];
}

/**
 * Saves admissions to localStorage and dispatches storage event for multi-tab and multi-portal reactivity
 */
export function saveStoredAdmissions(records: SharedAdmissionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMISSIONS_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event('storage'));
  } catch {}
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
    const raw = localStorage.getItem('oakland_students_directory');
    const students: any[] = raw ? JSON.parse(raw) : [];

    const existingIdx = students.findIndex(
      (s) =>
        s.admissionNo === record.referenceNumber ||
        (s.fullName && s.fullName.toLowerCase() === record.applicantName.toLowerCase() && s.class === record.appliedClass)
    );

    const nameParts = record.applicantName.trim().split(' ');
    const fName = record.firstName || nameParts[0] || 'Student';
    const lName = record.surname || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
    const mName = record.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '');

    const studentData = {
      id: existingIdx >= 0 ? students[existingIdx].id : `std-${Date.now()}`,
      admissionNo: record.referenceNumber,
      admissionNumber: record.referenceNumber,
      fullName: record.applicantName,
      name: record.applicantName,
      firstName: fName,
      middleName: mName,
      lastName: lName,
      class: record.appliedClass,
      gender: record.gender,
      dob: record.dob || '—',
      dateOfBirth: record.dob || '—',
      stateOfOrigin: record.stateOfOrigin || '—',
      lga: record.lga || '—',
      religion: record.religion || '—',
      previousSchool: record.previousSchool || '—',
      lastClassPassed: record.lastClassPassed || '—',
      address: record.residentialAddress || '—',
      residentialAddress: record.residentialAddress || '—',
      bloodGroup: record.bloodGroup || '—',
      genotype: record.genotype || '—',
      medicalConditions: record.medicalConditions || 'None reported',
      guardianName: record.parentName,
      guardianPhone: record.parentPhone,
      guardianEmail: record.parentEmail,
      fatherName: record.fatherName || record.parentName,
      fatherPhone: record.fatherPhone || record.parentPhone,
      fatherEmail: record.fatherEmail || record.parentEmail,
      motherName: record.motherName || '',
      motherPhone: record.motherPhone || '',
      motherEmail: record.motherEmail || '',
      attendanceRate: '100%',
      status: 'Active',
      feeStatus: 'Cleared',
      enrolledDate: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    };

    if (existingIdx >= 0) {
      students[existingIdx] = { ...students[existingIdx], ...studentData };
    } else {
      students.unshift(studentData);
    }

    localStorage.setItem('oakland_students_directory', JSON.stringify(students));
    window.dispatchEvent(new Event('storage'));

    // Persist directly to PostgreSQL database
    const studentDob = record.dob && record.dob !== '—' && !isNaN(Date.parse(record.dob))
      ? record.dob
      : '2012-05-15';

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
