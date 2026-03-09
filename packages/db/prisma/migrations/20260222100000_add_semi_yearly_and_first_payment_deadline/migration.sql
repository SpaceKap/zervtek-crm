-- Add SEMI_YEARLY to RecurringCostFrequency enum
ALTER TYPE "inquiry_pooler"."RecurringCostFrequency" ADD VALUE IF NOT EXISTS 'SEMI_YEARLY';

-- Add firstPaymentDeadline to RecurringCostTemplate (nullable for existing rows)
ALTER TABLE "inquiry_pooler"."RecurringCostTemplate" ADD COLUMN IF NOT EXISTS "firstPaymentDeadline" TIMESTAMP(3);
