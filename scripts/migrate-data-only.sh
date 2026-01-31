#!/bin/bash

# Simple data-only migration script
# Downloads data from Supabase and restores to local PostgreSQL

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Migrating data from Supabase to Local PostgreSQL...${NC}"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Cancelled${NC}"
    exit 1
fi

# Load env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$SUPABASE_BACKUP_URL" ]; then
    echo -e "${RED}❌ SUPABASE_BACKUP_URL not set${NC}"
    exit 1
fi

SUPABASE_URL=$(echo "$SUPABASE_BACKUP_URL" | sed 's/?$//')
TEMP_BACKUP="/tmp/data_dump_$(date +%s).sql"

echo -e "${YELLOW}📥 Downloading data from Supabase...${NC}"
pg_dump "$SUPABASE_URL" \
    --schema=inquiry_pooler \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers > "$TEMP_BACKUP"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to download${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Data downloaded${NC}"
echo -e "${YELLOW}📤 Restoring to local database...${NC}"

# Restore data
docker compose exec -T postgres psql -U postgres -d inquiry_pooler < "$TEMP_BACKUP"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restore${NC}"
    rm -f "$TEMP_BACKUP"
    exit 1
fi

rm -f "$TEMP_BACKUP"

echo -e "${GREEN}✅ Migration completed!${NC}"
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
SELECT 'Vehicle', COUNT(*) FROM inquiry_pooler.\"Vehicle\"
UNION ALL
SELECT 'Vendor', COUNT(*) FROM inquiry_pooler.\"Vendor\";
"
