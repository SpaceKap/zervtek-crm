#!/bin/bash

# Quick script to check backup contents and database size

echo "=== Checking Backup File ==="
if [ -f backups/backup_*.sql ]; then
    LATEST_BACKUP=$(ls -t backups/backup_*.sql | head -1)
    echo "Latest backup: $LATEST_BACKUP"
    echo "Size: $(ls -lh $LATEST_BACKUP | awk '{print $5}')"
    echo ""
    echo "First 50 lines:"
    head -50 $LATEST_BACKUP
    echo ""
    echo "Line count: $(wc -l < $LATEST_BACKUP)"
else
    echo "No backup files found"
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

# Check table counts
echo "Table row counts:"
docker compose exec -T postgres psql -U postgres -d $DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE schemaname = '$DB_SCHEMA'
ORDER BY n_live_tup DESC;
" 2>/dev/null || echo "Could not connect to database"
