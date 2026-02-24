-- AlterTable
ALTER TABLE "inquiry_pooler"."Customer" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" TIMESTAMP(3);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_emailVerificationToken_key" ON "inquiry_pooler"."Customer"("emailVerificationToken");
