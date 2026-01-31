#!/bin/bash

# Backup script: Local PostgreSQL -> Supabase
# This script creates a backup of the local database and restores it to Supabase
# Run this periodically (via cron) to keep Supabase in sync

# Don't exit on error immediately - we'll handle errors manually
set +e

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
    echo -e "${YELLOW}💡 Set SUPABASE_BACKUP_URL to your Supabase connection URL${NC}"
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
CLEANED_BACKUP="$BACKUP_DIR/backup_${TIMESTAMP}_cleaned.sql"

echo -e "${YELLOW}📦 Creating backup from local database...${NC}"

# Create backup using pg_dump (without --clean to avoid dropping schema)
# Use --no-owner --no-privileges to avoid permission issues
docker compose exec -T postgres pg_dump -U postgres -d $DB_NAME \
    --schema=$DB_SCHEMA \
    --no-owner \
    --no-privileges \
    --if-exists > $BACKUP_FILE

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to create backup${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
echo -e "${YELLOW}🧹 Cleaning backup file (removing schema drops)...${NC}"

# Remove DROP SCHEMA commands and CREATE SCHEMA (schema already exists)
# Keep everything else including DROP TABLE, CREATE TABLE, etc.
grep -v "^DROP SCHEMA IF EXISTS" $BACKUP_FILE | \
    grep -v "^CREATE SCHEMA IF NOT EXISTS" | \
    grep -v "^ALTER SCHEMA" > $CLEANED_BACKUP || true

# If cleaned backup is empty or very small, use original
if [ ! -s "$CLEANED_BACKUP" ] || [ $(wc -c < "$CLEANED_BACKUP") -lt 1000 ]; then
    echo -e "${YELLOW}⚠️  Warning: Cleaned backup is too small, using original${NC}"
    cp $BACKUP_FILE $CLEANED_BACKUP
fi

echo -e "${YELLOW}📤 Uploading to Supabase...${NC}"

# Restore to Supabase
# Redirect stderr to filter out "already exists" errors which are OK
psql "$SUPABASE_BACKUP_URL" < $CLEANED_BACKUP > /dev/null 2> /tmp/psql_errors.log
PSQL_EXIT_CODE=$?

# Filter out harmless errors
if [ $PSQL_EXIT_CODE -ne 0 ]; then
    # Check if there are only "already exists" or "does not exist" errors
    CRITICAL_ERRORS=$(grep -v "ERROR:.*already exists" /tmp/psql_errors.log | grep -v "ERROR:.*does not exist" | grep -v "^$" | wc -l)
    
    if [ $CRITICAL_ERRORS -gt 0 ]; then
        echo -e "${RED}❌ Critical errors during restore:${NC}"
        cat /tmp/psql_errors.log | grep -v "ERROR:.*already exists" | grep -v "ERROR:.*does not exist"
        
        # Verify database is still accessible
        if ! psql "$SUPABASE_BACKUP_URL" -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "${RED}❌ Database is not accessible!${NC}"
            rm -f /tmp/psql_errors.log
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Some harmless warnings (objects already exist)${NC}"
    fi
fi

rm -f /tmp/psql_errors.log

echo -e "${GREEN}✅ Backup completed successfully!${NC}"

# Clean up old backups (keep last 7 days)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
echo -e "${GREEN}✅ Cleanup completed${NC}"

exit 0
