#!/bin/sh
# Resolve merge conflicts by keeping the remote (origin) version of the given files.
# Run from repo root after a failed pull with conflicts, then: git add . && git commit -m "Merge: resolve conflicts (keep remote schema/migration)" && git push
set -e
echo "Resolving conflicts: keeping remote (theirs) version..."
git checkout --theirs -- packages/db/prisma/schema.prisma prisma/schema.prisma "packages/db/prisma/migrations/20260315100000_add_deposit_payment_link/migration.sql"
git add packages/db/prisma/schema.prisma prisma/schema.prisma "packages/db/prisma/migrations/20260315100000_add_deposit_payment_link/migration.sql"
echo "Done. Run: git status"
echo "If no other conflicts remain, run: git commit -m 'Merge: resolve conflicts (keep remote schema/migration)'"
echo "Then: ./update.sh (or git push if you don't use update.sh for deploy)"
