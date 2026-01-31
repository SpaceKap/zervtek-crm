#!/bin/bash

# Backup script: Local PostgreSQL -> Supabase
# This script creates a backup of the local database and restores it to Supabase
# Run this periodically (via cron) to keep Supabase in sync

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Starting backup to Supabase...${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

if [ -z "$SUPABASE_BACKUP_URL" ]; then
    echo -e "${RED}❌ Error: SUPABASE_BACKUP_URL not set in .env${NC}"
    echo -e "${YELLOW}💡 Set SUPABASE_BACKUP_URL to your Supabase direct connection URL (not pooler)${NC}"
    exit 1
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_SCHEMA="inquiry_pooler"

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

echo -e "${YELLOW}📦 Creating backup from local database...${NC}"

# Create backup using pg_dump
docker compose exec -T postgres pg_dump -U postgres -d $DB_NAME --schema=$DB_SCHEMA --clean --if-exists > $BACKUP_FILE

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to create backup${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo -e "${YELLOW}📤 Uploading to Supabase...${NC}"

# Restore to Supabase
psql "$SUPABASE_BACKUP_URL" < $BACKUP_FILE

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to restore to Supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup completed successfully!${NC}"

# Clean up old backups (keep last 7 days)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
echo -e "${GREEN}✅ Cleanup completed${NC}"
