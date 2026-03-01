#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: ./scripts/generate_incremental_migration.sh <migration_name>"
  echo "Example: ./scripts/generate_incremental_migration.sh financial_core_cutover"
  exit 2
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL environment variable is required."
  echo "Example: export DATABASE_URL=\"postgresql://user:pass@host:5432/db\""
  exit 2
fi

MIGRATION_NAME="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION_DIR="$ROOT_DIR/prisma/migrations/$(date +%Y%m%d)_${MIGRATION_NAME}"
MIGRATION_FILE="$MIGRATION_DIR/migration.sql"

mkdir -p "$MIGRATION_DIR"

DATABASE_URL="$DATABASE_URL" npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel "$ROOT_DIR/prisma/schema.prisma" \
  --script > "$MIGRATION_FILE"

if [ ! -s "$MIGRATION_FILE" ]; then
  echo "No schema diff detected. Generated file is empty: $MIGRATION_FILE"
  exit 1
fi

echo "Generated incremental migration: $MIGRATION_FILE"
