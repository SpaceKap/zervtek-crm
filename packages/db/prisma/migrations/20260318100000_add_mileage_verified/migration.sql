-- AlterTable
ALTER TABLE "inquiry_pooler"."StockListing" ADD COLUMN IF NOT EXISTS "mileageVerified" BOOLEAN DEFAULT false;
