import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're using a placeholder DATABASE_URL (build time)
const isPlaceholderUrl = process.env.DATABASE_URL?.includes('placeholder') || false

// Optimized Prisma client for Supabase
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Ensure proper connection management (skip if using placeholder URL)
if (!isPlaceholderUrl) {
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  } else {
    // In production, ensure connection is established
    prisma.$connect().catch((err) => {
      console.error('Failed to connect to database:', err)
    })
  }
}
