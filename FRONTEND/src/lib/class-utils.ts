export const STANDARD_CLASSES = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'] as const;

export type StandardClass = typeof STANDARD_CLASSES[number];

/**
 * Standardizes any class input (e.g., 'JSS1', 'jss 1', 'JSS-1', 'SSS 1', 'SS1A')
 * into the official 6 secondary class levels ('JSS 1' to 'SS 3').
 */
export function normalizeClass(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();

  // Match JSS 1, JSS1, JSS-1, JSS 1A, etc.
  const jssMatch = upper.match(/^(?:JSS|JS|J)\s*[-_]?\s*([1-3])/i);
  if (jssMatch) return `JSS ${jssMatch[1]}`;

  // Match SS 1, SSS 1, SS1, SS-1, SS 1A, etc.
  const ssMatch = upper.match(/^(?:SSS|SS|S)\s*[-_]?\s*([1-3])/i);
  if (ssMatch) return `SS ${ssMatch[1]}`;

  return trimmed;
}

/**
 * Parses single or multi-class inputs (comma/semicolon delimited, ranges like 'JSS 1-3',
 * or groups like 'All JSS', 'All SS', 'All Classes') into an array of normalized standard classes.
 */
export function normalizeClassList(raw?: string | string[] | null): string[] {
  if (!raw) return [];

  // If already an array, flatten and normalize
  if (Array.isArray(raw)) {
    const set = new Set<string>();
    raw.forEach((item) => {
      normalizeClassList(item).forEach((c) => set.add(c));
    });
    return STANDARD_CLASSES.filter((c) => set.has(c));
  }

  const str = String(raw).trim();
  if (!str || str.toLowerCase() === 'none' || str === '—' || str === '-') return [];

  const lower = str.toLowerCase();

  // Global keywords
  if (lower === 'all' || lower.includes('all classes') || lower.includes('entire school')) {
    return [...STANDARD_CLASSES];
  }
  if (lower.includes('all jss') || lower.includes('junior') || lower.includes('jss 1-3') || lower.includes('jss 1 - 3') || lower.includes('jss 1 - jss 3')) {
    const extra = str.includes('SS') ? normalizeClassList(str.replace(/all jss|junior|jss\s*1\s*[-–]\s*(?:jss\s*)?3/gi, '')) : [];
    const base = ['JSS 1', 'JSS 2', 'JSS 3'];
    return STANDARD_CLASSES.filter((c) => base.includes(c) || extra.includes(c));
  }
  if (lower.includes('all ss') || lower.includes('senior') || lower.includes('ss 1-3') || lower.includes('ss 1 - 3') || lower.includes('ss 1 - ss 3')) {
    const extra = str.includes('JSS') ? normalizeClassList(str.replace(/all ss|senior|ss\s*1\s*[-–]\s*(?:ss\s*)?3/gi, '')) : [];
    const base = ['SS 1', 'SS 2', 'SS 3'];
    return STANDARD_CLASSES.filter((c) => base.includes(c) || extra.includes(c));
  }

  // Split by comma, semicolon, slash, pipe, or 'and' / '&'
  const tokens = str.split(/[,;|/]|(?:\s+(?:and|&)\s+)/i);
  const found = new Set<string>();

  tokens.forEach((tok) => {
    const t = tok.trim();
    if (!t) return;

    // Check for range e.g. JSS 1-2
    const rangeMatch = t.match(/(JSS|SS)\s*([1-3])\s*[-–]\s*(?:(?:JSS|SS)\s*)?([1-3])/i);
    if (rangeMatch) {
      const prefix = rangeMatch[1].toUpperCase() === 'SS' ? 'SS' : 'JSS';
      const start = parseInt(rangeMatch[2], 10);
      const end = parseInt(rangeMatch[3], 10);
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let i = min; i <= max; i++) {
        found.add(`${prefix} ${i}`);
      }
      return;
    }

    const norm = normalizeClass(t);
    if (STANDARD_CLASSES.includes(norm as any)) {
      found.add(norm);
    }
  });

  return STANDARD_CLASSES.filter((c) => found.has(c));
}

/**
 * Resolves a dictionary mapping each of the 6 classes to their assigned Class Teacher's name.
 * Robust against variations in role naming, class strings, or object shapes.
 */
export function getClassTeacherMap(staffList: any[]): Record<string, string> {
  const map: Record<string, string> = {
    'JSS 1': 'Unassigned',
    'JSS 2': 'Unassigned',
    'JSS 3': 'Unassigned',
    'SS 1': 'Unassigned',
    'SS 2': 'Unassigned',
    'SS 3': 'Unassigned',
  };

  if (!Array.isArray(staffList)) return map;

  staffList.forEach((st) => {
    if (!st) return;

    // Check multiple possible class fields (both camelCase and snake_case)
    const rawClass = st.assignedClass || st.assigned_class || st.classTeacherOf || st.class;
    if (!rawClass || rawClass === 'None' || rawClass === 'Unassigned' || rawClass === '—') return;

    const norm = normalizeClass(rawClass);
    if (map[norm] !== undefined) {
      const teacherName = (st.name || `${st.first_name || st.firstName || ''} ${st.last_name || st.lastName || ''}`).trim();
      if (teacherName) {
        map[norm] = teacherName;
      }
    }
  });

  return map;
}

