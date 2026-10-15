import { prisma } from '../config/prisma.js';

async function listColumns() {
  const result: any = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  const existingModels = new Set([
    'users', 'schools', 'school_memberships', 'staff_profiles',
    'academic_sessions', 'academic_terms', 'classes', 'subjects',
    'teacher_assignments', 'students', 'class_enrollments', 'guardians',
    'student_guardians', 'attendance_records', 'assessment_categories',
    'assessments', 'scores', 'report_cards', 'fee_structures',
    'fee_invoices', 'fee_transactions', 'fee_payments'
  ]);

  const newTables: Record<string, any[]> = {};
  for (const row of result) {
    if (!existingModels.has(row.table_name)) {
      if (!newTables[row.table_name]) newTables[row.table_name] = [];
      newTables[row.table_name].push({
        col: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        def: row.column_default,
      });
    }
  }

  console.log(JSON.stringify(newTables, null, 2));
  await prisma.$disconnect();
}

listColumns();

