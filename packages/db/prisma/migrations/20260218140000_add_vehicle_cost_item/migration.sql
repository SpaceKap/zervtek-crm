-- CreateTable
CREATE TABLE "inquiry_pooler"."VehicleCostItem" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vendorId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "paymentDeadline" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleCostItem_vehicleId_idx" ON "inquiry_pooler"."VehicleCostItem"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleCostItem_vendorId_idx" ON "inquiry_pooler"."VehicleCostItem"("vendorId");

-- CreateIndex
CREATE INDEX "VehicleCostItem_paymentDeadline_idx" ON "inquiry_pooler"."VehicleCostItem"("paymentDeadline");

-- CreateIndex
CREATE INDEX "VehicleCostItem_paymentDate_idx" ON "inquiry_pooler"."VehicleCostItem"("paymentDate");

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."VehicleCostItem" ADD CONSTRAINT "VehicleCostItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "inquiry_pooler"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."VehicleCostItem" ADD CONSTRAINT "VehicleCostItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "inquiry_pooler"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
