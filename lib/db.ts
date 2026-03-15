import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Singleton PrismaClient - reutilizado em dev (HMR) e produção (evita pool exhaustion)
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.DATABASE_DEBUG === '1' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
