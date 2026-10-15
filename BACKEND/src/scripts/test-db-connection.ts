import { prisma } from '../config/prisma.js';

async function checkTables() {
  try {
    const schools = await prisma.school.findMany({ take: 3 });
    console.log('✅ Found schools in DB:', schools.length, schools.map(s => s.name));
  } catch (err: any) {
    console.log('⚠️ School query note:', err.message);
  }

  try {
    const users = await prisma.user.findMany({ take: 3 });
    console.log('✅ Found users in DB:', users.length);
  } catch (err: any) {
    console.log('ℹ️ Users table status:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
