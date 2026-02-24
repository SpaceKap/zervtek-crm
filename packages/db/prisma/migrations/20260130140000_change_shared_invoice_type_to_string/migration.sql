-- AlterTable: Change SharedInvoice.type from enum to String
-- Convert enum to text by casting
ALTER TABLE "inquiry_pooler"."SharedInvoice" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- Drop the enum type (if no other tables use it)
DROP TYPE IF EXISTS "inquiry_pooler"."SharedInvoiceType";
