-- Migration script to remove PAYMENT stage
-- Moves any vehicles in PAYMENT stage to TRANSPORT stage
-- Run this BEFORE removing PAYMENT from the enum

BEGIN;

-- Update vehicles in PAYMENT stage to TRANSPORT
UPDATE inquiry_pooler."Vehicle"
SET "currentShippingStage" = 'TRANSPORT'
WHERE "currentShippingStage" = 'PAYMENT';

-- Update VehicleShippingStage records
UPDATE inquiry_pooler."VehicleShippingStage"
SET stage = 'TRANSPORT'
WHERE stage = 'PAYMENT';

-- Update VehicleStageHistory records
UPDATE inquiry_pooler."VehicleStageHistory"
SET "newStage" = 'TRANSPORT'
WHERE "newStage" = 'PAYMENT';

UPDATE inquiry_pooler."VehicleStageHistory"
SET "previousStage" = NULL
WHERE "previousStage" = 'PAYMENT';

COMMIT;
