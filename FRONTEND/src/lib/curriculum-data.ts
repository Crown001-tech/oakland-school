/**
 * Official Nigerian Secondary School Curriculum (NERDC Standard)
 * Central Source of Truth for Subjects, Streams, and Teaching Allocations
 */

export interface SubjectItem {
  id: string;
  name: string;
  classLevel: string; // 'JSS 1' | 'JSS 2' | 'JSS 3' | 'SS 1' | 'SS 2' | 'SS 3'
  stream: 'Core' | 'Science' | 'Commercial' | 'Humanities';
  periodsPerWeek: number;
  assignedTeacher?: string;
  department: string;
}

export const JUNIOR_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Basic Science',
  'Basic Technology',
  'Computer Studies',
  'Social Studies',
  'Civic Education',
  'Agricultural Science',
  'French',
  'Cultural & Creative Arts (CCA)',
];

export const SENIOR_CORE_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Civic Education',
  'Computer Studies / Data Processing',
];

export const SENIOR_SCIENCE_SUBJECTS = [
  'Physics',
  'Chemistry',
  'Biology',
  'Further Mathematics',
  'Technical Drawing',
  'Agricultural Science',
];

export const SENIOR_COMMERCIAL_SUBJECTS = [
  'Financial Accounting',
  'Economics',
  'Commerce',
  'Business Management',
];

export const SENIOR_HUMANITIES_SUBJECTS = [
  'Literature in English',
  'Government',
  'Christian Religious Studies (CRS) / Islamic Religious Studies (IRS)',
  'History / Geography',
  'French',
];

/**
 * All distinct subject names across the entire school
 */
export const ALL_OFFICIAL_SUBJECT_NAMES = Array.from(
  new Set([
    ...JUNIOR_SUBJECTS,
    ...SENIOR_CORE_SUBJECTS,
    ...SENIOR_SCIENCE_SUBJECTS,
    ...SENIOR_COMMERCIAL_SUBJECTS,
    ...SENIOR_HUMANITIES_SUBJECTS,
  ])
).sort();

export const CURRICULUM_STORAGE_KEY = 'oakland_curriculum_subjects';

/**
 * Generates initial official Nigerian curriculum allocations for JSS 1 - SS 3
 */
export function generateInitialCurriculum(): SubjectItem[] {
  const items: SubjectItem[] = [];

  // JSS 1, JSS 2, JSS 3 — Exactly 10 subjects each
  ['JSS 1', 'JSS 2', 'JSS 3'].forEach((cls) => {
    JUNIOR_SUBJECTS.forEach((name, idx) => {
      let dept = 'Sciences';
      if (['English Language', 'French', 'Cultural & Creative Arts (CCA)'].includes(name)) {
        dept = 'Languages & Arts';
      } else if (['Social Studies', 'Civic Education'].includes(name)) {
        dept = 'Humanities';
      } else if (['Basic Technology', 'Computer Studies', 'Agricultural Science'].includes(name)) {
        dept = 'Vocational & Tech';
      }

      items.push({
        id: `cur-${cls.toLowerCase().replace(' ', '')}-${idx + 1}`,
        name,
        classLevel: cls,
        stream: 'Core',
        periodsPerWeek: ['Mathematics', 'English Language'].includes(name) ? 5 : 4,
        department: dept,
      });
    });
  });

  // SS 1, SS 2, SS 3 — General Core + Stream Specializations
  ['SS 1', 'SS 2', 'SS 3'].forEach((cls) => {
    // 1. General Core
    SENIOR_CORE_SUBJECTS.forEach((name, idx) => {
      items.push({
        id: `cur-${cls.toLowerCase().replace(' ', '')}-core-${idx + 1}`,
        name,
        classLevel: cls,
        stream: 'Core',
        periodsPerWeek: ['Mathematics', 'English Language'].includes(name) ? 5 : 4,
        department: ['Mathematics', 'Computer Studies / Data Processing'].includes(name) ? 'Sciences' : 'Languages & Arts',
      });
    });

    // 2. Science Stream
    SENIOR_SCIENCE_SUBJECTS.forEach((name, idx) => {
      items.push({
        id: `cur-${cls.toLowerCase().replace(' ', '')}-sci-${idx + 1}`,
        name,
        classLevel: cls,
        stream: 'Science',
        periodsPerWeek: 4,
        department: 'Sciences',
      });
    });

    // 3. Commercial Stream
    SENIOR_COMMERCIAL_SUBJECTS.forEach((name, idx) => {
      items.push({
        id: `cur-${cls.toLowerCase().replace(' ', '')}-comm-${idx + 1}`,
        name,
        classLevel: cls,
        stream: 'Commercial',
        periodsPerWeek: 4,
        department: 'Commercial',
      });
    });

    // 4. Humanities Stream
    SENIOR_HUMANITIES_SUBJECTS.forEach((name, idx) => {
      items.push({
        id: `cur-${cls.toLowerCase().replace(' ', '')}-hum-${idx + 1}`,
        name,
        classLevel: cls,
        stream: 'Humanities',
        periodsPerWeek: 4,
        department: 'Humanities',
      });
    });
  });

  return items;
}

/**
 * Loads stored curriculum subjects or initializes with official curriculum
 */
export function getStoredCurriculum(): SubjectItem[] {
  if (typeof window === 'undefined') return generateInitialCurriculum();

  try {
    const raw = localStorage.getItem(CURRICULUM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  const initial = generateInitialCurriculum();
  try {
    localStorage.setItem(CURRICULUM_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

/**
 * Saves curriculum subjects and dispatches storage event for cross-module sync
 */
export function saveStoredCurriculum(subjects: SubjectItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRICULUM_STORAGE_KEY, JSON.stringify(subjects));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

/**
 * Returns a sorted unique list of all subject names currently registered in the school curriculum
 */
export function getRegisteredCurriculumSubjectNames(): string[] {
  const curriculum = getStoredCurriculum();
  const set = new Set<string>();
  curriculum.forEach((item) => {
    if (item.name && item.name.trim()) {
      set.add(item.name.trim());
    }
  });
  return Array.from(set).sort();
}

/**
 * Common abbreviations and aliases mapped to standard curriculum subjects
 */
const SUBJECT_ALIASES: Record<string, string> = {
  'math': 'Mathematics',
  'maths': 'Mathematics',
  'general mathematics': 'Mathematics',
  'further math': 'Further Mathematics',
  'further maths': 'Further Mathematics',
  'english': 'English Language',
  'eng': 'English Language',
  'bio': 'Biology',
  'chem': 'Chemistry',
  'phys': 'Physics',
  'econ': 'Economics',
  'econs': 'Economics',
  'financial account': 'Financial Accounting',
  'accounting': 'Financial Accounting',
  'accounts': 'Financial Accounting',
  'commerce': 'Commerce',
  'comm': 'Commerce',
  'business management': 'Business Management',
  'business studies': 'Business Management',
  'lit in eng': 'Literature in English',
  'lit in english': 'Literature in English',
  'literature': 'Literature in English',
  'lit': 'Literature in English',
  'government': 'Government',
  'govt': 'Government',
  'civic': 'Civic Education',
  'civic education': 'Civic Education',
  'social studies': 'Social Studies',
  'social': 'Social Studies',
  'basic science': 'Basic Science',
  'basic sci': 'Basic Science',
  'basic tech': 'Basic Technology',
  'basic technology': 'Basic Technology',
  'agric': 'Agricultural Science',
  'agric science': 'Agricultural Science',
  'agriculture': 'Agricultural Science',
  'computer': 'Computer Studies',
  'computer studies': 'Computer Studies',
  'data processing': 'Computer Studies / Data Processing',
  'computer studies / data processing': 'Computer Studies / Data Processing',
  'french': 'French',
  'technical drawing': 'Technical Drawing',
  'tech drawing': 'Technical Drawing',
  'crs': 'Christian Religious Studies (CRS) / Islamic Religious Studies (IRS)',
  'irs': 'Christian Religious Studies (CRS) / Islamic Religious Studies (IRS)',
  'crk': 'Christian Religious Studies (CRS) / Islamic Religious Studies (IRS)',
  'irk': 'Christian Religious Studies (CRS) / Islamic Religious Studies (IRS)',
  'cca': 'Cultural & Creative Arts (CCA)',
  'creative arts': 'Cultural & Creative Arts (CCA)',
  'cultural and creative arts': 'Cultural & Creative Arts (CCA)',
};

/**
 * Matches a raw subject name against the Principal's registered curriculum subjects.
 * If matched, returns the canonical curriculum subject name.
 * If not matched in registered curriculum, returns null (subject must be dropped).
 */
export function matchCurriculumSubject(rawName: string, registeredNames?: string[]): string | null {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim();
  if (!clean || clean === '—' || clean === '-' || clean.toLowerCase() === 'none') return null;

  const list = registeredNames || getRegisteredCurriculumSubjectNames();
  const lowerClean = clean.toLowerCase();

  // 1. Exact match (case insensitive)
  const exact = list.find((s) => s.toLowerCase() === lowerClean);
  if (exact) return exact;

  // 2. Check alias mapping
  const aliasTarget = SUBJECT_ALIASES[lowerClean];
  if (aliasTarget) {
    const aliasMatch = list.find((s) => s.toLowerCase() === aliasTarget.toLowerCase());
    if (aliasMatch) return aliasMatch;
  }

  // 3. Normalized punctuation / whitespace check
  const strip = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const strippedClean = strip(lowerClean);
  const strippedMatch = list.find((s) => strip(s) === strippedClean);
  if (strippedMatch) return strippedMatch;

  // 4. Substring / partial match only if unambiguous and closely aligned
  const subMatch = list.find((s) => {
    const sLower = s.toLowerCase();
    return sLower.startsWith(lowerClean) || lowerClean.startsWith(sLower);
  });
  if (subMatch) return subMatch;

  // No match in the Principal's registered curriculum
  return null;
}

/**
 * Validates and filters an array of raw subjects against the Principal's registered curriculum.
 * Any subject not present in the registered curriculum is dropped.
 */
export function filterValidCurriculumSubjects(rawSubjects: string[], registeredNames?: string[]): string[] {
  if (!Array.isArray(rawSubjects) || rawSubjects.length === 0) return [];
  const list = registeredNames || getRegisteredCurriculumSubjectNames();
  const result: string[] = [];

  rawSubjects.forEach((raw) => {
    const matched = matchCurriculumSubject(raw, list);
    if (matched && !result.includes(matched)) {
      result.push(matched);
    }
  });

  return result;
}

