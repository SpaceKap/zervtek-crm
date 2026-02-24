-- AlterTable
ALTER TABLE "inquiry_pooler"."Customer" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
