#!/bin/bash

# Migration script: Supabase -> Local PostgreSQL (FIXED VERSION)
# This script migrates your data from Supabase to the local PostgreSQL database

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting migration from Supabase to Local PostgreSQL...${NC}"
echo -e "${YELLOW}⚠️  This will replace all data in your local database!${NC}"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Migration cancelled${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$SUPABASE_BACKUP_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_BACKUP_URL not set in .env${NC}"
    echo -e "${YELLOW}💡 Set SUPABASE_BACKUP_URL to your Supabase direct connection URL${NC}"
    exit 1
fi

# Check if local database is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${RED}❌ Error: Local PostgreSQL container is not running${NC}"
    echo -e "${YELLOW}💡 Start it with: docker compose up -d postgres${NC}"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for local PostgreSQL to be ready...${NC}"
sleep 5

# Remove trailing ? from URL if present
SUPABASE_URL=$(echo "$SUPABASE_BACKUP_URL" | sed 's/?$//')
DB_SCHEMA="inquiry_pooler"

# Create temporary backup file
TEMP_BACKUP="./temp_supabase_backup.sql"

echo -e "${YELLOW}📥 Downloading data from Supabase...${NC}"

# Use pg_dump with data-only to avoid schema conflicts
# First, get schema (structure only)
pg_dump "$SUPABASE_URL" \
    --schema=$DB_SCHEMA \
    --schema-only \
    --no-owner \
    --no-privileges > /tmp/schema_only.sql 2>&1 || true

# Then get data only
pg_dump "$SUPABASE_URL" \
    --schema=$DB_SCHEMA \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers > $TEMP_BACKUP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to download from Supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Data downloaded${NC}"
echo -e "${YELLOW}📤 Restoring data to local database...${NC}"

# Restore data to local database
# Use single transaction to ensure all or nothing
docker compose exec -T postgres psql -U postgres -d inquiry_pooler << EOF
BEGIN;

-- Disable triggers temporarily
SET session_replication_role = replica;

-- Restore data
\i /dev/stdin

COMMIT;

-- Re-enable triggers
SET session_replication_role = DEFAULT;
EOF < $TEMP_BACKUP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to restore to local database${NC}"
    rm -f $TEMP_BACKUP
    exit 1
fi

# Clean up
rm -f $TEMP_BACKUP /tmp/schema_only.sql

echo -e "${GREEN}✅ Migration completed successfully!${NC}"

# Verify data was copied
echo -e "${YELLOW}🔍 Verifying data...${NC}"
docker compose exec -T postgres psql -U postgres -d inquiry_pooler -c "
SELECT 
    'User' as table_name, COUNT(*) as count FROM inquiry_pooler.\"User\"
UNION ALL
SELECT 'Invoice', COUNT(*) FROM inquiry_pooler.\"Invoice\"
UNION ALL
SELECT 'Inquiry', COUNT(*) FROM inquiry_pooler.\"Inquiry\"
UNION ALL
SELECT 'Customer', COUNT(*) FROM inquiry_pooler.\"Customer\"
UNION ALL
SELECT 'Vehicle', COUNT(*) FROM inquiry_pooler.\"Vehicle\";
"
