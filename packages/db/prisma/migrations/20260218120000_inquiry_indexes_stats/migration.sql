-- Improve inquiry list and stats query performance
-- Composite index for status + date filters (lists, groupBy status, funnel)
CREATE INDEX IF NOT EXISTS "Inquiry_status_createdAt_idx" ON "inquiry_pooler"."Inquiry"("status", "createdAt");

-- Expression index for stats by country (metadata->>'country')
CREATE INDEX IF NOT EXISTS "Inquiry_metadata_country_idx" ON "inquiry_pooler"."Inquiry" ((metadata->>'country'));

-- Expression index for second-attempt failure stats ((metadata->>'attemptCount')::int)
CREATE INDEX IF NOT EXISTS "Inquiry_metadata_attemptCount_idx" ON "inquiry_pooler"."Inquiry" (((metadata->>'attemptCount')::int));
