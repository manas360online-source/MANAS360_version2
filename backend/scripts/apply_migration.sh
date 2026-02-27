#!/usr/bin/env bash
set -euo pipefail

MIGRATION_FILE="$(dirname "$0")/../prisma/migrations/20260227_add_versioning/migration.sql"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL environment variable is required. Example: export DATABASE_URL=\"postgresql://user:pass@host:5432/db\""
  exit 2
fi

echo "Applying migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION_FILE"

echo "Migration applied. Next run: npm run backfill:versions (backend) to create version rows for existing templates if needed."
