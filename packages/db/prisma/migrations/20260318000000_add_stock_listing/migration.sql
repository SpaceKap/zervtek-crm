-- CreateTable
CREATE TABLE "inquiry_pooler"."StockListing" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "fobPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "brand" TEXT,
    "model" TEXT,
    "grade" TEXT,
    "year" INTEGER,
    "mileage" INTEGER,
    "transmission" TEXT,
    "extColor" TEXT,
    "fuel" TEXT,
    "drive" TEXT,
    "doors" INTEGER,
    "engine" TEXT,
    "score" TEXT,
    "equipment" TEXT,
    "photoUrls" JSONB,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "description" TEXT,
    "tag" TEXT NOT NULL DEFAULT 'Stock Listing',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockListing_stockId_key" ON "inquiry_pooler"."StockListing"("stockId");

-- CreateIndex
CREATE INDEX "StockListing_stockId_idx" ON "inquiry_pooler"."StockListing"("stockId");

-- CreateIndex
CREATE INDEX "StockListing_status_idx" ON "inquiry_pooler"."StockListing"("status");

-- CreateIndex
CREATE INDEX "StockListing_tag_idx" ON "inquiry_pooler"."StockListing"("tag");

-- CreateIndex
CREATE INDEX "StockListing_createdAt_idx" ON "inquiry_pooler"."StockListing"("createdAt");

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."StockListing" ADD CONSTRAINT "StockListing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "inquiry_pooler"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
