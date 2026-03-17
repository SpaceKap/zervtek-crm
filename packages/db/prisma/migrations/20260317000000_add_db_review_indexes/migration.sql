-- Add indexes recommended by database review (VPS Postgres)
-- Account: index on userId for session/account lookups by user
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "inquiry_pooler"."Account"("userId");

-- Session: index on userId for session invalidation / listing by user
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "inquiry_pooler"."Session"("userId");

-- AuditLog: index on vehicleId for audit-by-vehicle queries
CREATE INDEX IF NOT EXISTS "AuditLog_vehicleId_idx" ON "inquiry_pooler"."AuditLog"("vehicleId");

-- DepositPaymentLink: composite index for webhook lookup by paypalInvoiceId + status
CREATE INDEX IF NOT EXISTS "DepositPaymentLink_paypalInvoiceId_status_idx" ON "inquiry_pooler"."DepositPaymentLink"("paypalInvoiceId", "status");
