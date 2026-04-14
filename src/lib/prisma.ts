import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL + '&connection_limit=1'
    } 
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

prisma.$on('error', (e) => {
  console.error('[Prisma Error]', e.message);
});

prisma.$on('warn', (e) => {
  console.warn('[Prisma Warn]', e.message);
});

process.on('SIGINT', async () => { 
  await prisma.$disconnect(); 
  process.exit(0); 
});

process.on('SIGTERM', async () => { 
  await prisma.$disconnect(); 
  process.exit(0); 
});