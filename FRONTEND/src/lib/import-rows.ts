/**
 * Bulk import: turns a table of text cells (from a CSV, pasted text or an Excel sheet) into records,
 * and checks every row against the school's own data. Nothing is guessed: a row that is missing a
 * required value, names a class the school does not have, or repeats another row is flagged with the
 * reason, and only clean rows are ever imported.
 */

export type ImportKind = 'students' | 'staff' | 'classes';

export interface RowIssue {
  /** 1-based row number as the user sees it in their file (the header is row 1) */
  row: number;
  messages: string[];
}

export interface CheckedRows<T> {
  valid: T[];
  /** Every row's issues, so the preview can show which rows were left out and why */
  issues: RowIssue[];
  total: number;
}

export interface Table {
  headers: string[];
  rows: string[][];
}

export interface ImportContext {
  /** The school's class names */
  classes: string[];
  /** The school's registered subjects (staff import) */
  subjects?: string[];
  /** Admission numbers and emails already in the database */
  existingAdmissionNos?: string[];
  existingEmails?: string[];
}

export interface StudentImportRow {
  fullName: string;
  gender: 'Male' | 'Female';
  class: string;
  admissionNo?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export interface StaffImportRow {
  name: string;
  email: string;
  phone?: string;
  role: 'Class Teacher' | 'Subject Teacher' | 'Non-Teaching Staff';
  department?: string;
  assignedClass?: string;
  assignedClasses: string[];
  subjects: string[];
}

export interface ClassImportRow {
  name: string;
  /** Set when the file has Level and Arm columns; otherwise the level is worked out from the name */
  level?: string;
  arm?: string;
  capacity?: number;
  /** Tuition per term for the class's level, for a level outside JSS and SS */
  tuition?: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLANK = new Set(['', '-', '—', 'none', 'n/a', 'na', 'unassigned']);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const clean = (s: string | undefined) => (s ?? '').trim();
const isBlank = (s: string | undefined) => BLANK.has(norm(s ?? ''));

/** Splits delimited text (comma, tab or semicolon, with quoted cells) into a table. */
export function parseDelimited(text: string): Table {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const first = lines[0];
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') && !first.includes(',') ? ';' : ',';

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delimiter) {
        cells.push(cell.trim());
        cell = '';
      } else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };

  const all = lines.map(splitLine);
  return tableFromCells(all);
}

/** Builds a table from rows of cells whose first row is the header. */
export function tableFromCells(cells: string[][]): Table {
  if (cells.length === 0) return { headers: [], rows: [] };
  return {
    headers: cells[0].map((h) => norm(h)),
    rows: cells.slice(1).filter((r) => r.some((c) => clean(c))),
  };
}

const findColumn = (headers: string[], ...needles: string[]) =>
  headers.findIndex((h) => needles.some((n) => h.includes(n)));

const cell = (row: string[], idx: number) => (idx === -1 ? '' : clean(row[idx]));

/** Finds a class by name, ignoring case and spacing ("jss1" matches "JSS 1"). */
export function matchClass(raw: string, classes: string[]): string | null {
  const key = (s: string) => s.toLowerCase().replace(/[\s._-]+/g, '');
  const target = key(raw);
  if (!target) return null;
  return classes.find((c) => key(c) === target) ?? null;
}

/** Each row's number as shown in the user's file: the header is row 1, so the first record is row 2. */
const rowNumber = (index: number) => index + 2;

function finish<T>(total: number, valid: T[], issues: RowIssue[]): CheckedRows<T> {
  return { valid, issues, total };
}

export function checkStudentRows(table: Table, ctx: ImportContext): CheckedRows<StudentImportRow> {
  const h = table.headers;
  const nameIdx = findColumn(h, 'name', 'student');
  const genderIdx = findColumn(h, 'gender', 'sex');
  const classIdx = findColumn(h, 'class', 'grade');
  const admIdx = findColumn(h, 'admission', 'reg');
  const parentNameIdx = findColumn(h, 'parent name', 'guardian name', 'parent', 'guardian');
  const phoneIdx = findColumn(h, 'phone', 'mobile');
  const emailIdx = findColumn(h, 'email', 'mail');

  const valid: StudentImportRow[] = [];
  const issues: RowIssue[] = [];
  const existing = new Set((ctx.existingAdmissionNos ?? []).map(norm));
  const seenAdm = new Set<string>();
  const seenNames = new Set<string>();

  table.rows.forEach((row, i) => {
    const messages: string[] = [];
    const fullName = cell(row, nameIdx);
    if (!fullName) messages.push('Missing student name.');
    else if (fullName.split(/\s+/).length < 2) messages.push('Give the first and last name.');

    const rawGender = cell(row, genderIdx);
    const g = norm(rawGender);
    const gender = g.startsWith('m') ? 'Male' : g.startsWith('f') ? 'Female' : null;
    if (!gender) messages.push(rawGender ? `Gender "${rawGender}" is not Male or Female.` : 'Missing gender.');

    const rawClass = cell(row, classIdx);
    const className = matchClass(rawClass, ctx.classes);
    if (!rawClass) messages.push('Missing class.');
    else if (!className) messages.push(`Class "${rawClass}" is not one of this school's classes.`);

    const admissionNo = cell(row, admIdx);
    if (admissionNo) {
      const key = norm(admissionNo);
      if (existing.has(key)) messages.push(`Admission number ${admissionNo} already exists.`);
      else if (seenAdm.has(key)) messages.push(`Admission number ${admissionNo} appears twice in this file.`);
      seenAdm.add(key);
    }

    const nameKey = `${norm(fullName)}|${className ?? ''}`;
    if (fullName && !admissionNo) {
      if (seenNames.has(nameKey)) messages.push('Same name and class appear twice in this file.');
      seenNames.add(nameKey);
    }

    const guardianEmail = cell(row, emailIdx);
    if (!isBlank(guardianEmail) && !EMAIL.test(guardianEmail)) messages.push(`Guardian email "${guardianEmail}" is not valid.`);

    if (messages.length > 0) {
      issues.push({ row: rowNumber(i), messages });
      return;
    }
    valid.push({
      fullName,
      gender: gender as 'Male' | 'Female',
      class: className as string,
      admissionNo: admissionNo || undefined,
      guardianName: isBlank(cell(row, parentNameIdx)) ? undefined : cell(row, parentNameIdx),
      guardianPhone: isBlank(cell(row, phoneIdx)) ? undefined : cell(row, phoneIdx),
      guardianEmail: isBlank(guardianEmail) ? undefined : guardianEmail,
    });
  });

  return finish(table.rows.length, valid, issues);
}

const splitList = (raw: string) =>
  raw
    .split(/[;,|/]|(?:\s+(?:and|&)\s+)/i)
    .map((s) => s.trim())
    .filter((s) => !isBlank(s));

export function checkStaffRows(table: Table, ctx: ImportContext): CheckedRows<StaffImportRow> {
  const h = table.headers;
  const nameIdx = findColumn(h, 'name', 'staff');
  const roleIdx = findColumn(h, 'role', 'designation');
  const deptIdx = findColumn(h, 'dept', 'department');
  const homeroomIdx = findColumn(h, 'homeroom', 'form class', 'assigned class');
  const taughtIdx = findColumn(h, 'classes taught', 'class taught', 'teaching class', 'assigned classes');
  const subjectIdx = findColumn(h, 'subject', 'course');
  const emailIdx = findColumn(h, 'email', 'mail');
  const phoneIdx = findColumn(h, 'phone', 'mobile');

  const valid: StaffImportRow[] = [];
  const issues: RowIssue[] = [];
  const existing = new Set((ctx.existingEmails ?? []).map(norm));
  const seenEmail = new Set<string>();
  const subjectsKnown = ctx.subjects ?? [];

  table.rows.forEach((row, i) => {
    const messages: string[] = [];
    const name = cell(row, nameIdx);
    if (!name) messages.push('Missing staff name.');

    const email = cell(row, emailIdx);
    if (!EMAIL.test(email)) messages.push(email ? `Email "${email}" is not valid.` : 'Missing email.');
    else {
      const key = norm(email);
      if (existing.has(key)) messages.push(`${email} already has an account.`);
      else if (seenEmail.has(key)) messages.push(`${email} appears twice in this file.`);
      seenEmail.add(key);
    }

    const rawRole = norm(cell(row, roleIdx));
    let role: StaffImportRow['role'];
    if (/class teacher|homeroom|form tutor/.test(rawRole)) role = 'Class Teacher';
    else if (/admin|security|facilit|driver|nurse|clean|non-teaching|bursar|reception/.test(rawRole)) role = 'Non-Teaching Staff';
    else if (/teacher|tutor|lecturer|subject/.test(rawRole)) role = 'Subject Teacher';
    else {
      role = 'Subject Teacher';
      messages.push(rawRole ? `Role "${cell(row, roleIdx)}" is not recognised.` : 'Missing role.');
    }

    const homeroomRaw = cell(row, homeroomIdx);
    let assignedClass: string | undefined;
    if (!isBlank(homeroomRaw)) {
      const m = matchClass(homeroomRaw, ctx.classes);
      if (!m) messages.push(`Class "${homeroomRaw}" is not one of this school's classes.`);
      else assignedClass = m;
    }
    const taught: string[] = [];
    for (const raw of splitList(cell(row, taughtIdx))) {
      const m = matchClass(raw, ctx.classes);
      if (!m) messages.push(`Class "${raw}" is not one of this school's classes.`);
      else if (!taught.includes(m)) taught.push(m);
    }
    if (role === 'Class Teacher' && !assignedClass) messages.push('A class teacher needs an assigned class.');
    if (role === 'Class Teacher' && assignedClass && !taught.includes(assignedClass)) taught.unshift(assignedClass);

    const subjects: string[] = [];
    for (const raw of splitList(cell(row, subjectIdx))) {
      const match = subjectsKnown.find((s) => norm(s) === norm(raw));
      if (!match) messages.push(`Subject "${raw}" is not registered for this school.`);
      else if (!subjects.includes(match)) subjects.push(match);
    }

    if (messages.length > 0) {
      issues.push({ row: rowNumber(i), messages });
      return;
    }
    const teaching = role !== 'Non-Teaching Staff';
    valid.push({
      name,
      email,
      phone: isBlank(cell(row, phoneIdx)) ? undefined : cell(row, phoneIdx),
      role,
      department: isBlank(cell(row, deptIdx)) ? undefined : cell(row, deptIdx),
      assignedClass: role === 'Class Teacher' ? assignedClass : undefined,
      assignedClasses: teaching ? taught : [],
      subjects: teaching ? subjects : [],
    });
  });

  return finish(table.rows.length, valid, issues);
}

export function checkClassRows(table: Table, ctx: ImportContext): CheckedRows<ClassImportRow> {
  const h = table.headers;
  const levelIdx = findColumn(h, 'level');
  const armIdx = findColumn(h, 'arm', 'section', 'stream');
  const nameIdx = levelIdx === -1 ? findColumn(h, 'name', 'class') : -1;
  const capacityIdx = findColumn(h, 'capacity', 'seats', 'size');
  const tuitionIdx = findColumn(h, 'tuition', 'fee');
  const valid: ClassImportRow[] = [];
  const issues: RowIssue[] = [];
  const seen = new Set(ctx.classes.map((c) => norm(c)));

  table.rows.forEach((row, i) => {
    const messages: string[] = [];
    const level = cell(row, levelIdx);
    const arm = isBlank(cell(row, armIdx)) ? '' : cell(row, armIdx);
    const name = levelIdx !== -1 ? (level ? (arm ? `${level} ${arm}` : level) : '') : cell(row, nameIdx);
    if (!name) messages.push(levelIdx !== -1 ? 'Missing level.' : 'Missing class name.');
    else if (seen.has(norm(name))) messages.push(`Class "${name}" already exists or appears twice.`);
    seen.add(norm(name));

    let capacity: number | undefined;
    const rawCap = cell(row, capacityIdx);
    if (!isBlank(rawCap)) {
      const n = Number(rawCap);
      if (!Number.isInteger(n) || n < 1) messages.push(`Capacity "${rawCap}" must be a whole number above 0.`);
      else capacity = n;
    }

    let tuition: number | undefined;
    const rawFee = cell(row, tuitionIdx);
    if (!isBlank(rawFee)) {
      const n = Number(rawFee.replace(/,/g, ''));
      if (!Number.isFinite(n) || n <= 0) messages.push(`Tuition "${rawFee}" must be an amount above 0.`);
      else tuition = n;
    }

    if (messages.length > 0) {
      issues.push({ row: rowNumber(i), messages });
      return;
    }
    valid.push(levelIdx !== -1 ? { name, level, arm: arm || undefined, capacity, tuition } : { name, capacity, tuition });
  });

  return finish(table.rows.length, valid, issues);
}
