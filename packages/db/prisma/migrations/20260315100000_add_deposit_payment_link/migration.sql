-- CreateTable
CREATE TABLE "inquiry_pooler"."DepositPaymentLink" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "token" TEXT NOT NULL,
    "memo" TEXT,
    "paypalInvoiceId" TEXT,
    "paypalPaymentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositPaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositPaymentLink_token_key" ON "inquiry_pooler"."DepositPaymentLink"("token");

-- CreateIndex (unique for one-to-one relation)
CREATE UNIQUE INDEX "DepositPaymentLink_transactionId_key" ON "inquiry_pooler"."DepositPaymentLink"("transactionId");

-- CreateIndex
CREATE INDEX "DepositPaymentLink_customerId_idx" ON "inquiry_pooler"."DepositPaymentLink"("customerId");

-- CreateIndex
CREATE INDEX "DepositPaymentLink_token_idx" ON "inquiry_pooler"."DepositPaymentLink"("token");

-- CreateIndex
CREATE INDEX "DepositPaymentLink_status_idx" ON "inquiry_pooler"."DepositPaymentLink"("status");

-- CreateIndex
CREATE INDEX "DepositPaymentLink_expiresAt_idx" ON "inquiry_pooler"."DepositPaymentLink"("expiresAt");

-- CreateIndex
CREATE INDEX "DepositPaymentLink_paypalInvoiceId_idx" ON "inquiry_pooler"."DepositPaymentLink"("paypalInvoiceId");

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."DepositPaymentLink" ADD CONSTRAINT "DepositPaymentLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "inquiry_pooler"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."DepositPaymentLink" ADD CONSTRAINT "DepositPaymentLink_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "inquiry_pooler"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_pooler"."DepositPaymentLink" ADD CONSTRAINT "DepositPaymentLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "inquiry_pooler"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
