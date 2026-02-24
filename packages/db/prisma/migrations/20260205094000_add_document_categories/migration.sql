-- Add new DocumentCategory enum values
-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in PostgreSQL

-- Add RELEASED_BILL_OF_LADING (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'RELEASED_BILL_OF_LADING' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."DocumentCategory" ADD VALUE 'RELEASED_BILL_OF_LADING';
    END IF;
END $$;

-- Add AUCTION_SHEET (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'AUCTION_SHEET' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'DocumentCategory' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'inquiry_pooler'))
    ) THEN
        ALTER TYPE "inquiry_pooler"."DocumentCategory" ADD VALUE 'AUCTION_SHEET';
    END IF;
END $$;
