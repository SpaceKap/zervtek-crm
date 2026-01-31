#!/bin/bash

echo "=== Checking Database Schema ==="
docker compose exec -T postgres psql -U postgres -d inquiry_pooler -c "\dn" 2>&1

echo ""
echo "=== Checking Tables in Schema ==="
docker compose exec -T postgres psql -U postgres -d inquiry_pooler -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'inquiry_pooler'
ORDER BY table_name;
" 2>&1

echo ""
echo "=== Checking Row Counts ==="
docker compose exec -T postgres psql -U postgres -d inquiry_pooler -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE schemaname = 'inquiry_pooler'
ORDER BY tablename;
" 2>&1

echo ""
echo "=== Checking if Supabase has data ==="
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep SUPABASE_BACKUP_URL | xargs)
    if [ -n "$SUPABASE_BACKUP_URL" ]; then
        echo "Checking Supabase connection..."
        # Remove trailing ? if present
        SUPABASE_URL=$(echo "$SUPABASE_BACKUP_URL" | sed 's/?$//')
        psql "$SUPABASE_URL" -c "
        SELECT 
            schemaname,
            tablename,
            n_live_tup as row_count
        FROM pg_stat_user_tables 
        WHERE schemaname = 'inquiry_pooler'
        ORDER BY n_live_tup DESC
        LIMIT 10;
        " 2>&1 | head -30
    else
        echo "SUPABASE_BACKUP_URL not set in .env"
    fi
fi
