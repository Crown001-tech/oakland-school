import { StaffModel } from '../modules/staff/staff.model.js';
import { prisma } from '../config/prisma.js';

async function testStaff() {
  console.log('Testing StaffModel.list()...');
  const staff = await StaffModel.list();
  console.log(`Successfully fetched ${staff.length} staff records!`);
  const principal = staff.find(s => s.role === 'admin' || s.employee_id === 'OAK-ADM-001');
  if (principal) {
    console.log(`Principal found: ${principal.first_name} ${principal.last_name} (${principal.email}, ${principal.employee_id})`);
  }
  await prisma.$disconnect();
}

testStaff().catch(err => {
  console.error('Test staff error:', err);
  process.exit(1);
});
