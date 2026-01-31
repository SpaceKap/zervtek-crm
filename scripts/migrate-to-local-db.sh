#!/bin/bash

# Migration script: Supabase -> Local PostgreSQL
# This script migrates your data from Supabase to the local PostgreSQL database
# Run this ONCE when setting up the local database

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

# Extract database name from SUPABASE_BACKUP_URL
DB_NAME=$(echo $SUPABASE_BACKUP_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_SCHEMA="inquiry_pooler"

# Create temporary backup file
TEMP_BACKUP="./temp_supabase_backup.sql"

echo -e "${YELLOW}📥 Downloading data from Supabase...${NC}"
pg_dump "$SUPABASE_BACKUP_URL" --schema=$DB_SCHEMA --clean --if-exists > $TEMP_BACKUP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to download from Supabase${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Data downloaded${NC}"
echo -e "${YELLOW}📤 Restoring to local database...${NC}"

# Restore to local database
docker compose exec -T postgres psql -U postgres -d $DB_NAME < $TEMP_BACKUP

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to restore to local database${NC}"
    rm -f $TEMP_BACKUP
    exit 1
fi

# Clean up
rm -f $TEMP_BACKUP

echo -e "${GREEN}✅ Migration completed successfully!${NC}"
echo -e "${YELLOW}💡 Update your .env file to use the local DATABASE_URL${NC}"
