-- Add OFFICE_EXPENSES to VendorCategory enum (safe to run; idempotent in PG 10+ with IF NOT EXISTS)
--
-- Run one of:
-- 1. From project root (uses DATABASE_URL from .env):  node scripts/run-add-office-expenses-enum.js
-- 2. Supabase Dashboard: SQL Editor → paste this line → Run
-- 3. psql (ensure DATABASE_URL is set):  node -e "require('dotenv').config(); require('child_process').execSync('psql \"' + process.env.DATABASE_URL + '\" -f scripts/add-office-expenses-enum.sql', { stdio: 'inherit' })"
--
ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE IF NOT EXISTS 'OFFICE_EXPENSES';
