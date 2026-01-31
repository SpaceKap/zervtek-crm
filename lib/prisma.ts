import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimized Prisma client for Supabase
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Connection pool settings optimized for Supabase pooler
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Ensure proper connection management
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // In production, ensure connection is established
  prisma.$connect().catch((err) => {
    console.error('Failed to connect to database:', err)
  })
}
