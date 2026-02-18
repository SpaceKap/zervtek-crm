#!/usr/bin/env bash
# Run cleanup-unassigned-inquiries on the VPS host (not inside the container).
# The app container image doesn't include scripts/ or tsx; Postgres is exposed on localhost:5432.
#
# Usage (from repo root on VPS):
#   ./scripts/run-cleanup-on-vps.sh [--dry-run]
#
# Requires: .env with DATABASE_URL (host part will be replaced with localhost for this run).

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Error: .env not found. Create it from .env.example and set DATABASE_URL."
  exit 1
fi

# Load .env and rewrite DATABASE_URL to use localhost so we can reach Postgres from the host
set -a
source .env
set +a
export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's|@[^:/]*:5432|@localhost:5432|')

exec npx tsx scripts/cleanup-unassigned-inquiries.ts "$@"
