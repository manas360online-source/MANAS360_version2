#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/var/www/manas360"
BACKEND_DIR="$ROOT_DIR/backend"

cd "$BACKEND_DIR"
npx prisma db seed

echo "Database seeding completed."
