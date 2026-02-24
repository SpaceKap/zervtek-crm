-- Add paymentDeadline column to CostItem (nullable first, then set defaults, then make required)
ALTER TABLE "inquiry_pooler"."CostItem" 
ADD COLUMN "paymentDeadline" TIMESTAMP;

-- Set default paymentDeadline for existing rows (use paymentDate if exists, otherwise use createdAt + 30 days)
UPDATE "inquiry_pooler"."CostItem" 
SET "paymentDeadline" = COALESCE("paymentDate", "createdAt" + INTERVAL '30 days')
WHERE "paymentDeadline" IS NULL;

-- Make paymentDeadline required (NOT NULL)
ALTER TABLE "inquiry_pooler"."CostItem" 
ALTER COLUMN "paymentDeadline" SET NOT NULL;

-- Add paymentDeadline column to SharedInvoice (nullable first, then set defaults, then make required)
ALTER TABLE "inquiry_pooler"."SharedInvoice" 
ADD COLUMN "paymentDeadline" TIMESTAMP;

-- Set default paymentDeadline for existing rows (use date if exists, otherwise use createdAt + 30 days)
UPDATE "inquiry_pooler"."SharedInvoice" 
SET "paymentDeadline" = COALESCE("date", "createdAt" + INTERVAL '30 days')
WHERE "paymentDeadline" IS NULL;

-- Make paymentDeadline required (NOT NULL)
ALTER TABLE "inquiry_pooler"."SharedInvoice" 
ALTER COLUMN "paymentDeadline" SET NOT NULL;

-- Make paymentDate optional in CostItem (was required, now optional)
ALTER TABLE "inquiry_pooler"."CostItem" 
ALTER COLUMN "paymentDate" DROP NOT NULL;

-- Make date optional in SharedInvoice (was required, now optional)
ALTER TABLE "inquiry_pooler"."SharedInvoice" 
ALTER COLUMN "date" DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "CostItem_paymentDeadline_idx" ON "inquiry_pooler"."CostItem"("paymentDeadline");
CREATE INDEX IF NOT EXISTS "CostItem_paymentDate_idx" ON "inquiry_pooler"."CostItem"("paymentDate");
CREATE INDEX IF NOT EXISTS "SharedInvoice_paymentDeadline_idx" ON "inquiry_pooler"."SharedInvoice"("paymentDeadline");
CREATE INDEX IF NOT EXISTS "Invoice_createdById_idx" ON "inquiry_pooler"."Invoice"("createdById");
CREATE INDEX IF NOT EXISTS "Invoice_status_createdAt_idx" ON "inquiry_pooler"."Invoice"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "InvoiceCharge_invoiceId_createdAt_idx" ON "inquiry_pooler"."InvoiceCharge"("invoiceId", "createdAt");
