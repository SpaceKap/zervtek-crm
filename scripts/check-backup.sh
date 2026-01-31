#!/bin/bash

# Quick script to check backup contents and database size

echo "=== Checking Backup File ==="
LATEST_BACKUP=$(ls -t backups/backup_*.sql 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ] && [ -f "$LATEST_BACKUP" ]; then
    echo "Latest backup: $LATEST_BACKUP"
    echo "Size: $(ls -lh "$LATEST_BACKUP" | awk '{print $5}')"
    echo ""
    echo "First 50 lines:"
    head -50 "$LATEST_BACKUP"
    echo ""
    echo "Line count: $(wc -l < "$LATEST_BACKUP")"
else
    echo "No backup files found in backups/ directory"
fi

echo ""
echo "=== Checking Local Database ==="
# Load env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_SCHEMA="inquiry_pooler"

echo "Database: $DB_NAME"
echo "Schema: $DB_SCHEMA"
echo ""

# Check if postgres container is running
if ! docker compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL container is not running!"
    echo "Start it with: docker compose up -d postgres"
    exit 1
fi

# Check table counts
echo "Table row counts:"
docker compose exec -T postgres psql -U postgres -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE schemaname = '$DB_SCHEMA'
ORDER BY n_live_tup DESC;
"
