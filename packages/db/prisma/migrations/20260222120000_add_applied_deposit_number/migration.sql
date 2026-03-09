-- For OUTGOING "Applied from wallet to Invoice" transactions, store which deposit was applied (e.g. DEP-8001)
ALTER TABLE "inquiry_pooler"."Transaction" ADD COLUMN IF NOT EXISTS "appliedDepositNumber" TEXT;
