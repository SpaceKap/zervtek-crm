-- Add new VendorCategory enum values
-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in PostgreSQL
-- So we add them one at a time

-- Add FORWARDER (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FORWARDER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VendorCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE 'FORWARDER';
    END IF;
END $$;

-- Add SHIPPING_AGENT (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'SHIPPING_AGENT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VendorCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE 'SHIPPING_AGENT';
    END IF;
END $$;

-- Add YARD (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'YARD' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'VendorCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."VendorCategory" ADD VALUE 'YARD';
    END IF;
END $$;
