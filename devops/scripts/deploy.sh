#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/var/www/manas360"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

cd "$ROOT_DIR"
git fetch origin develop
git checkout develop
git pull origin develop

cd "$BACKEND_DIR"
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

cd "$FRONTEND_DIR"
npm ci
npm run build

pm2 restart manas360-backend || pm2 start "$BACKEND_DIR/dist/server.js" --name manas360-backend --time --log /var/log/backend.log
pm2 save
sudo nginx -t
sudo systemctl reload nginx

echo "Staging deployment completed successfully."
