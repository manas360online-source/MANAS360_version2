#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/prisma/migrations"
TARGET_MIGRATION="${1:-}"

if [ -z "$TARGET_MIGRATION" ]; then
  LATEST_DIR="$(ls -1 "$MIGRATIONS_DIR" | sort | tail -n 1)"
  MIGRATION_FILE="$MIGRATIONS_DIR/$LATEST_DIR/migration.sql"
else
  if [ -f "$TARGET_MIGRATION" ]; then
    MIGRATION_FILE="$TARGET_MIGRATION"
  else
    MIGRATION_FILE="$MIGRATIONS_DIR/$TARGET_MIGRATION/migration.sql"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL environment variable is required. Example: export DATABASE_URL=\"postgresql://user:pass@host:5432/db\""
  exit 2
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  echo "Usage: ./scripts/apply_migration.sh [migration_dir_name|/absolute/path/to/migration.sql]"
  exit 2
fi

echo "Applying migration: $MIGRATION_FILE"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIGRATION_FILE"

echo "Migration applied successfully."
