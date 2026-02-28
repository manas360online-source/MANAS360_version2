#!/usr/bin/env bash
# Downloads the landing page hero image into frontend/public/hero.jpg
set -euo pipefail

OUT_DIR="frontend/public"
OUT_FILE="$OUT_DIR/hero.jpg"
URL="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop"

mkdir -p "$OUT_DIR"
echo "Downloading hero image to $OUT_FILE"
curl -fSL "$URL" -o "$OUT_FILE"
echo "Downloaded."
