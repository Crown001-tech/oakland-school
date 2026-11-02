import { describe, expect, it } from 'vitest';
import { checkClassRows, checkStaffRows, checkStudentRows, parseDelimited, tableFromCells } from '@/lib/import-rows';

const classes = ['Year 7', 'Year 8'];
const ctx = { classes, subjects: ['Mathematics', 'English'], existingAdmissionNos: ['A-1'], existingEmails: ['taken@school.test'] };

describe('parsing', () => {
  it('reads quoted cells, tabs and semicolons', () => {
    expect(parseDelimited('Name,Class\n"Doe, Jane",Year 7').rows).toEqual([['Doe, Jane', 'Year 7']]);
    expect(parseDelimited('Name\tClass\nJane Doe\tYear 7').rows).toEqual([['Jane Doe', 'Year 7']]);
    expect(parseDelimited('Name;Class\nJane Doe;Year 7').headers).toEqual(['name', 'class']);
  });

  it('skips empty lines and a byte order mark', () => {
    const t = parseDelimited('﻿Name,Class\n\nJane Doe,Year 7\n,\n');
    expect(t.headers).toEqual(['name', 'class']);
    expect(t.rows).toHaveLength(1);
  });
});

describe('student rows', () => {
  const table = (rows: string[][]) => tableFromCells([['Full Name', 'Gender', 'Class', 'Admission No', 'Parent Name', 'Parent Phone', 'Parent Email'], ...rows]);

  it('accepts a clean row and matches the class ignoring case and spacing', () => {
    const r = checkStudentRows(table([['Jane Doe', 'female', 'year7', 'B-1', 'Mr Doe', '0800', 'doe@x.test']]), ctx);
    expect(r.issues).toEqual([]);
    expect(r.valid[0]).toMatchObject({ fullName: 'Jane Doe', gender: 'Female', class: 'Year 7', admissionNo: 'B-1', guardianName: 'Mr Doe' });
  });

  it('flags a class the school does not have instead of using a default', () => {
    const r = checkStudentRows(table([['Jane Doe', 'Female', 'JSS 1', '', '', '', '']]), ctx);
    expect(r.valid).toEqual([]);
    expect(r.issues[0]).toEqual({ row: 2, messages: ['Class "JSS 1" is not one of this school\'s classes.'] });
  });

  it('flags missing values, bad email, and admission numbers that exist or repeat', () => {
    const r = checkStudentRows(
      table([
        ['', 'Male', 'Year 7', '', '', '', ''],
        ['Sam Lee', '', 'Year 7', '', '', '', ''],
        ['Ann Poe', 'Female', 'Year 8', 'A-1', '', '', 'not-an-email'],
        ['Bob Ray', 'Male', 'Year 8', 'C-1', '', '', ''],
        ['Bob Roy', 'Male', 'Year 8', 'C-1', '', '', ''],
      ]),
      ctx
    );
    expect(r.valid.map((v) => v.fullName)).toEqual(['Bob Ray']);
    expect(r.issues.map((i) => i.row)).toEqual([2, 3, 4, 6]);
    expect(r.issues[2].messages).toEqual(expect.arrayContaining(['Admission number A-1 already exists.']));
  });

  it('does not invent a guardian when none is given', () => {
    const r = checkStudentRows(table([['Jane Doe', 'Female', 'Year 7', '', '', '', '']]), ctx);
    expect(r.valid[0].guardianName).toBeUndefined();
    expect(r.valid[0].guardianPhone).toBeUndefined();
  });
});

describe('staff rows', () => {
  const table = (rows: string[][]) => tableFromCells([['Full Name', 'Role', 'Department', 'Assigned Class', 'Classes Taught', 'Subject', 'Email', 'Phone'], ...rows]);

  it('accepts a class teacher and adds the assigned class to the classes taught', () => {
    const r = checkStaffRows(table([['Ada Obi', 'Class Teacher', '', 'Year 7', 'Year 8', 'Mathematics', 'ada@school.test', '']]), ctx);
    expect(r.issues).toEqual([]);
    expect(r.valid[0]).toMatchObject({ role: 'Class Teacher', assignedClass: 'Year 7', assignedClasses: ['Year 7', 'Year 8'], subjects: ['Mathematics'] });
  });

  it('flags unknown subjects and classes, taken and repeated emails, and an unrecognised role', () => {
    const r = checkStaffRows(
      table([
        ['A One', 'Subject Teacher', '', '', 'Year 9', 'Mathematics', 'a@school.test', ''],
        ['B Two', 'Subject Teacher', '', '', 'Year 7', 'Basket Weaving', 'b@school.test', ''],
        ['C Three', 'Subject Teacher', '', '', 'Year 7', 'English', 'taken@school.test', ''],
        ['D Four', 'Wizard', '', '', '', '', 'd@school.test', ''],
        ['E Five', 'Subject Teacher', '', '', 'Year 7', 'English', 'e@school.test', ''],
        ['F Six', 'Subject Teacher', '', '', 'Year 7', 'English', 'e@school.test', ''],
      ]),
      ctx
    );
    expect(r.valid.map((v) => v.name)).toEqual(['E Five']);
    expect(r.issues.map((i) => i.row)).toEqual([2, 3, 4, 5, 7]);
  });

  it('keeps non-teaching staff free of classes and subjects', () => {
    const r = checkStaffRows(table([['G Gate', 'Security', '', '', 'Year 7', 'English', 'g@school.test', '']]), ctx);
    expect(r.valid[0]).toMatchObject({ role: 'Non-Teaching Staff', assignedClasses: [], subjects: [] });
  });
});

describe('class rows with tuition', () => {
  it('reads a tuition amount, with commas, and rejects a bad one', () => {
    const t = tableFromCells([['Class Name', 'Capacity', 'Tuition'], ['Diamond', '25', '150,000'], ['Silver', '', 'free']]);
    const r = checkClassRows(t, ctx);
    expect(r.valid).toEqual([{ name: 'Diamond', capacity: 25, tuition: 150000 }]);
    expect(r.issues[0].messages[0]).toContain('Tuition "free"');
  });
});

describe('class rows with a level and an arm', () => {
  it('builds the class name from level and arm, and rejects a repeated class', () => {
    const t = tableFromCells([['Level', 'Arm', 'Capacity'], ['Year 7', 'Diamond', '25'], ['Year 7', 'Silver', ''], ['Year 7', 'Diamond', ''], ['', 'A', ''], ['Year 8', '', '']]);
    const r = checkClassRows(t, ctx);
    // Year 8 is one of this test school's existing classes
    expect(r.valid.map((v) => v.name)).toEqual(['Year 7 Diamond', 'Year 7 Silver']);
    expect(r.valid[0]).toMatchObject({ level: 'Year 7', arm: 'Diamond', capacity: 25 });
    expect(r.issues.map((i) => i.row)).toEqual([4, 5, 6]);
  });
});

describe('class rows', () => {
  const table = (rows: string[][]) => tableFromCells([['Class Name', 'Capacity'], ...rows]);

  it('accepts new classes and rejects existing, repeated and bad capacity', () => {
    const r = checkClassRows(table([['Year 9', '30'], ['Year 7', ''], ['Year 10', 'many'], ['Year 11', ''], ['year 11', '']]), ctx);
    expect(r.valid).toEqual([{ name: 'Year 9', capacity: 30, tuition: undefined }, { name: 'Year 11', capacity: undefined, tuition: undefined }]);
    expect(r.issues.map((i) => i.row)).toEqual([3, 4, 6]);
  });
});
