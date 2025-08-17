import { PrismaClient } from '../generated/prisma';

// Prevent multiple instances in dev with nodemon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as any;

export const prisma: PrismaClient =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;


