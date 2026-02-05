-- SQL to run in Supabase SQL Editor
-- This will delete all customers and vehicles from the inquiry_pooler schema

-- First, delete vehicles (they might have foreign key relationships)
DELETE FROM "inquiry_pooler"."Vehicle";

-- Then delete customers
DELETE FROM "inquiry_pooler"."Customer";

-- Verify deletion (optional - run these to check)
-- SELECT COUNT(*) FROM "inquiry_pooler"."Vehicle";
-- SELECT COUNT(*) FROM "inquiry_pooler"."Customer";
