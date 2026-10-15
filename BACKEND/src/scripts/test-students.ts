import { StudentsModel } from '../modules/students/students.model.js';

async function testStudents() {
  console.log('Testing StudentsModel via Prisma ORM...');
  const students = await StudentsModel.list();
  console.log(`✅ Loaded ${students.length} students from PostgreSQL:`);
  for (const s of students) {
    console.log(` - ${s.first_name} ${s.last_name} (${s.admission_number}) - Status: ${s.status}`);
  }
}

testStudents();
