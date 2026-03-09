-- Add deposit number for DEPOSIT transactions (e.g. DEP-8001)
ALTER TABLE "inquiry_pooler"."Transaction" ADD COLUMN IF NOT EXISTS "depositNumber" TEXT;
