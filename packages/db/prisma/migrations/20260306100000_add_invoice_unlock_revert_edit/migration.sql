-- Add unlock, revert-to-draft, and edit tracking columns to Invoice
ALTER TABLE "inquiry_pooler"."Invoice" ADD COLUMN IF NOT EXISTS "unlockedById" TEXT;
ALTER TABLE "inquiry_pooler"."Invoice" ADD COLUMN IF NOT EXISTS "unlockedAt" TIMESTAMP(3);
ALTER TABLE "inquiry_pooler"."Invoice" ADD COLUMN IF NOT EXISTS "revertedToDraftById" TEXT;
ALTER TABLE "inquiry_pooler"."Invoice" ADD COLUMN IF NOT EXISTS "revertedToDraftAt" TIMESTAMP(3);
ALTER TABLE "inquiry_pooler"."Invoice" ADD COLUMN IF NOT EXISTS "editedById" TEXT;
ALTER TABLE "inquiry_pooler"."Invoice" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_unlockedById_fkey') THEN
    ALTER TABLE "inquiry_pooler"."Invoice"
      ADD CONSTRAINT "Invoice_unlockedById_fkey"
      FOREIGN KEY ("unlockedById") REFERENCES "inquiry_pooler"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_revertedToDraftById_fkey') THEN
    ALTER TABLE "inquiry_pooler"."Invoice"
      ADD CONSTRAINT "Invoice_revertedToDraftById_fkey"
      FOREIGN KEY ("revertedToDraftById") REFERENCES "inquiry_pooler"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_editedById_fkey') THEN
    ALTER TABLE "inquiry_pooler"."Invoice"
      ADD CONSTRAINT "Invoice_editedById_fkey"
      FOREIGN KEY ("editedById") REFERENCES "inquiry_pooler"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
