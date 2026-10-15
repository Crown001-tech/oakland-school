import { prisma } from '../config/prisma.js';

async function updateForeignKeys() {
  console.log('Cleaning legacy auth.users references and updating foreign keys...');
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.staff_profiles DROP CONSTRAINT IF EXISTS staff_profiles_user_id_fkey;
    `);
    console.log('✅ Dropped legacy auth.users constraint on staff_profiles');

    await prisma.$executeRawUnsafe(`
      UPDATE public.staff_profiles 
      SET user_id = NULL 
      WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);
    `);
    console.log('✅ Cleaned legacy user_ids on staff_profiles');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.staff_profiles 
      ADD CONSTRAINT staff_profiles_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    `);
    console.log('✅ Added public.users foreign key constraint on staff_profiles');

    // Also handle school_memberships
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.school_memberships DROP CONSTRAINT IF EXISTS school_memberships_user_id_fkey;
    `);
    console.log('✅ Dropped legacy auth.users constraint on school_memberships');

    await prisma.$executeRawUnsafe(`
      DELETE FROM public.school_memberships 
      WHERE user_id NOT IN (SELECT id FROM public.users);
    `);
    console.log('✅ Cleaned legacy user_ids on school_memberships');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.school_memberships 
      ADD CONSTRAINT school_memberships_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added public.users foreign key constraint on school_memberships');

  } catch (error: any) {
    console.error('❌ Error updating foreign keys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateForeignKeys();
