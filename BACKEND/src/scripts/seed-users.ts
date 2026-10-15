import { prisma } from '../config/prisma.js';
import { PasswordUtil } from '../common/utils/password.util.js';
import { UserRole } from '@prisma/client';

async function seedUsers() {
  console.log('Synchronizing users from existing staff profiles...');
  try {
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('No school found in database.');
      return;
    }
    console.log(`School: ${school.name} (${school.id})`);

    // 1. Ensure Proprietor user account exists
    const defaultPasswordHash = await PasswordUtil.hash(PasswordUtil.DEFAULT_STAFF_PASSWORD);
    const proprietorEmail = 'proprietor@oaklandschools.edu.ng';

    let proprietor = await prisma.user.findUnique({
      where: { email: proprietorEmail },
    });

    if (!proprietor) {
      proprietor = await prisma.user.create({
        data: {
          email: proprietorEmail,
          passwordHash: defaultPasswordHash,
          role: UserRole.proprietor,
          schoolId: school.id,
        },
      });
      console.log(`✅ Created proprietor user account: ${proprietor.email}`);
    } else {
      console.log(`ℹ️ Proprietor user already exists: ${proprietor.email}`);
    }

    // 2. Sync all staff profiles into users table
    const staffProfiles = await prisma.staffProfile.findMany({
      where: { schoolId: school.id },
    });
    console.log(`Found ${staffProfiles.length} staff profiles.`);

    for (const staff of staffProfiles) {
      if (!staff.email) continue;
      const cleanEmail = staff.email.trim().toLowerCase();

      let user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            passwordHash: defaultPasswordHash,
            role: staff.role || UserRole.teacher,
            schoolId: school.id,
          },
        });
        console.log(`✅ Created user for staff: ${cleanEmail} (${staff.firstName} ${staff.lastName})`);
      }

      if (staff.userId !== user.id) {
        await prisma.staffProfile.update({
          where: { id: staff.id },
          data: { userId: user.id },
        });
        console.log(`🔗 Linked staff profile ${staff.employeeId} to user ${user.id}`);
      }
    }

    const totalUsers = await prisma.user.count();
    console.log(`🎉 Total users in public.users: ${totalUsers}`);
  } catch (error: any) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedUsers();
