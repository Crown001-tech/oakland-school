import { prisma } from '../config/prisma.js';

async function setupUsersTable() {
  console.log('Creating public.users table for native Argon2 auth...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role user_role_enum NOT NULL DEFAULT 'teacher',
        school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created table public.users');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
    `);
    console.log('✅ Created index idx_users_email');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users(school_id);
    `);
    console.log('✅ Created index idx_users_school_id');

    const count = await prisma.user.count();
    console.log('✅ Users count in public.users:', count);
  } catch (error: any) {
    console.error('❌ Error creating users table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupUsersTable();
