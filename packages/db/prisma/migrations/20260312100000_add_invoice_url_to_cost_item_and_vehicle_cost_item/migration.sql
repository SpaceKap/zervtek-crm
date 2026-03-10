-- Add invoiceUrl to CostItem and VehicleCostItem for linking vendor invoice/receipt documents

ALTER TABLE "inquiry_pooler"."CostItem" ADD COLUMN IF NOT EXISTS "invoiceUrl" TEXT;

ALTER TABLE "inquiry_pooler"."VehicleCostItem" ADD COLUMN IF NOT EXISTS "invoiceUrl" TEXT;
