import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ENV.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (ENV.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
