-- CreateEnum
CREATE TYPE "inquiry_pooler"."RecurringCostFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "inquiry_pooler"."RecurringCostType" AS ENUM ('RECURRING', 'FIXED');

-- CreateTable
CREATE TABLE "inquiry_pooler"."RecurringCostTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "frequency" "inquiry_pooler"."RecurringCostFrequency" NOT NULL,
    "type" "inquiry_pooler"."RecurringCostType" NOT NULL DEFAULT 'RECURRING',
    "vendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringCostTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_pooler"."RecurringCostInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountOverride" DECIMAL(12,2),
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringCostInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringCostTemplate_vendorId_idx" ON "inquiry_pooler"."RecurringCostTemplate"("vendorId");

-- CreateIndex
CREATE INDEX "RecurringCostInstance_templateId_idx" ON "inquiry_pooler"."RecurringCostInstance"("templateId");

-- CreateIndex
CREATE INDEX "RecurringCostInstance_dueDate_idx" ON "inquiry_pooler"."RecurringCostInstance"("dueDate");

-- CreateIndex
CREATE INDEX "RecurringCostInstance_paidAt_idx" ON "inquiry_pooler"."RecurringCostInstance"("paidAt");

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."RecurringCostTemplate" ADD CONSTRAINT "RecurringCostTemplate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "inquiry_pooler"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."RecurringCostInstance" ADD CONSTRAINT "RecurringCostInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inquiry_pooler"."RecurringCostTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
