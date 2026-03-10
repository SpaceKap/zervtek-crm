-- Add VendorCategory enum values: INSPECTIONS, INSURANCE, OTHER

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'INSPECTIONS'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VendorCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE 'INSPECTIONS';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'INSURANCE'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VendorCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE 'INSURANCE';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'OTHER'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VendorCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE 'OTHER';
    END IF;
END $$;
