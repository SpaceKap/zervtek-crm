#!/bin/bash
# Verify that the backup-to-supabase process is working.
# Run on the VPS (from repo root) or anywhere with .env and psql.
# Usage: ./scripts/verify-backup-to-supabase.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo -e "${YELLOW}=== Backup verification (local → Supabase) ===${NC}"
echo ""

# 1. Recent local backup file
echo -e "${YELLOW}1. Recent local backup file${NC}"
LATEST=$(ls -t backups/backup_*_cleaned.sql backups/backup_*.sql 2>/dev/null | head -1)
if [ -n "$LATEST" ] && [ -f "$LATEST" ]; then
  AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST")) / 3600 ))
  echo -e "   Latest: $LATEST"
  echo -e "   Size:   $(ls -lh "$LATEST" | awk '{print $5}')"
  if [ "$AGE" -lt 48 ]; then
    echo -e "   ${GREEN}✓ File is $AGE hours old (looks recent)${NC}"
  else
    echo -e "   ${YELLOW}⚠ File is $AGE hours old (cron may not be running)${NC}"
  fi
else
  echo -e "   ${RED}✗ No backup files in backups/${NC}"
fi
echo ""

# 2. Backup log (if cron logs to a file)
echo -e "${YELLOW}2. Backup log (last run)${NC}"
for LOG in /var/log/postgres-backup.log ./logs/backup.log; do
  if [ -f "$LOG" ]; then
    echo "   Log: $LOG"
    echo "   Last 5 lines:"
    tail -5 "$LOG" | sed 's/^/   /'
    break
  fi
done
if [ ! -f /var/log/postgres-backup.log ] && [ ! -f ./logs/backup.log ]; then
  echo "   No standard log file found. If using cron, check: grep CRON /var/log/syslog"
fi
echo ""

# 3. Supabase connectivity and row counts
echo -e "${YELLOW}3. Supabase (backup target)${NC}"
if [ -z "$SUPABASE_BACKUP_URL" ]; then
  echo -e "   ${RED}✗ SUPABASE_BACKUP_URL not set in .env${NC}"
else
  SUPABASE_URL=$(echo "$SUPABASE_BACKUP_URL" | sed 's/?$//')
  if psql "$SUPABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓ Can connect to Supabase${NC}"
    echo "   Row counts (inquiry_pooler schema):"
    psql "$SUPABASE_URL" -t -c "
      SELECT '   ' || tablename || ': ' || n_live_tup
      FROM pg_stat_user_tables
      WHERE schemaname = 'inquiry_pooler'
      ORDER BY n_live_tup DESC
      LIMIT 8;
    " 2>/dev/null || true
    echo "   Latest activity (max updatedAt) in key tables:"
    psql "$SUPABASE_URL" -t -c "
      SELECT '   User:      ' || COALESCE(MAX(\"updatedAt\")::text, 'no rows') FROM inquiry_pooler.\"User\"
      UNION ALL
      SELECT '   Inquiry:   ' || COALESCE(MAX(\"updatedAt\")::text, 'no rows') FROM inquiry_pooler.\"Inquiry\"
      UNION ALL
      SELECT '   Vehicle:   ' || COALESCE(MAX(\"updatedAt\")::text, 'no rows') FROM inquiry_pooler.\"Vehicle\";
    " 2>/dev/null || true
  else
    echo -e "   ${RED}✗ Cannot connect to Supabase (check SUPABASE_BACKUP_URL and network)${NC}"
  fi
fi
echo ""

# 4. Local DB (source) row count for quick compare
echo -e "${YELLOW}4. Local database (backup source)${NC}"
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^/?]*\).*|\1|p')
if [ -z "$DB_NAME" ]; then
  DB_NAME="inquiry_pooler"
fi
if docker compose exec -T postgres psql -U postgres -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "   ${GREEN}✓ Local Postgres is running${NC}"
  echo "   Total rows in inquiry_pooler (approx):"
  docker compose exec -T postgres psql -U postgres -d "$DB_NAME" -t -c "
    SELECT '   ' || SUM(n_live_tup)::text || ' rows across all tables'
    FROM pg_stat_user_tables WHERE schemaname = 'inquiry_pooler';
  " 2>/dev/null || true
else
  echo -e "   ${YELLOW}⚠ Local Postgres not reachable (is Docker running?)${NC}"
fi

echo ""
echo -e "${GREEN}Done. If Supabase row counts and dates look recent, the backup process is working.${NC}"
