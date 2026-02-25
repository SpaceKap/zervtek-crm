import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const isPlaceholderUrl =
  process.env.DATABASE_URL?.includes("placeholder") ?? false;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (!isPlaceholderUrl) {
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  } else {
    prisma.$connect().catch((err) => {
      console.error("Failed to connect to database:", err);
    });
  }
}

export { PrismaClient };
export type * from "@prisma/client";
