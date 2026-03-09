-- Add DEPOSIT to TransactionDirection enum (inquiry_pooler schema)
-- Note: On PostgreSQL < 12 this may need to be run outside a transaction
ALTER TYPE "inquiry_pooler"."TransactionDirection" ADD VALUE IF NOT EXISTS 'DEPOSIT';

-- Add appliedDepositTransactionId to InvoiceCharge for linking DEPOSIT charges to the transaction being applied
ALTER TABLE "inquiry_pooler"."InvoiceCharge" ADD COLUMN IF NOT EXISTS "appliedDepositTransactionId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceCharge_appliedDepositTransactionId_fkey'
  ) THEN
    ALTER TABLE "inquiry_pooler"."InvoiceCharge"
      ADD CONSTRAINT "InvoiceCharge_appliedDepositTransactionId_fkey"
      FOREIGN KEY ("appliedDepositTransactionId") REFERENCES "inquiry_pooler"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InvoiceCharge_appliedDepositTransactionId_idx" ON "inquiry_pooler"."InvoiceCharge"("appliedDepositTransactionId");
