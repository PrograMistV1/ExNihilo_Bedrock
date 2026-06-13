#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
BP_DIR="$ROOT_DIR/ExNihilo_BP"
RP_DIR="$ROOT_DIR/ExNihilo_RP"
DIST_DIR="$ROOT_DIR/dist"
STAGING_DIR="$DIST_DIR/staging"

BP_VERSION="$(node -e "const manifest = require('$BP_DIR/manifest.json'); console.log(manifest.header.version);")"
ARCHIVE_PATH="$DIST_DIR/ExNihilo_Bedrock-${BP_VERSION}.zip"
MCADDON_PATH="$DIST_DIR/ExNihilo_Bedrock-${BP_VERSION}.mcaddon"

echo "[1/5] Installing BP dependencies (if needed) and compiling TypeScript..."
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  npm install
fi
npm run build

echo "[2/5] Preparing clean staging directory..."
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR/ExNihilo_BP" "$STAGING_DIR/ExNihilo_RP"

rsync -a \
  --exclude '.git/' \
  --exclude '.idea/' \
  --exclude 'node_modules/' \
  --exclude 'src/' \
  --exclude 'package.json' \
  --exclude 'package-lock.json' \
  --exclude 'tsconfig.json' \
  --exclude '*.tsbuildinfo' \
  --exclude '.DS_Store' \
  "$BP_DIR/" "$STAGING_DIR/ExNihilo_BP/"

rsync -a \
  --exclude '.git/' \
  --exclude '.idea/' \
  --exclude 'node_modules/' \
  --exclude '.DS_Store' \
  --exclude 'texts/*.json' \
  "$RP_DIR/" "$STAGING_DIR/ExNihilo_RP/"

echo "[3/5] Converting JSON translations to .lang files..."
TEXTS_SRC="$RP_DIR/texts"
TEXTS_DST="$STAGING_DIR/ExNihilo_RP/texts"
mkdir -p "$TEXTS_DST"

# Copy languages.json as-is
cp "$TEXTS_SRC/languages.json" "$TEXTS_DST/languages.json"

# Convert all other .json to .lang
for json_file in "$TEXTS_SRC"/*.json; do
  [ -f "$json_file" ] || continue
  filename="$(basename "$json_file" .json)"
  [ "$filename" = "languages" ] && continue
  lang_file="$TEXTS_DST/${filename}.lang"
  python3 -c "
import json
with open('$json_file', 'r', encoding='utf-8') as f:
    data = json.load(f)
with open('$lang_file', 'w', encoding='utf-8') as f:
    for key, value in data.items():
        escaped = value.replace('\\n', '\\\\n').replace('\n', '\\n')
        f.write(key + '=' + escaped + '\n')
"
  echo "  Converted: ${filename}.json → ${filename}.lang"
done

echo "[4/5] Copying LICENSE into BP and RP..."
cp "$ROOT_DIR/LICENSE" "$STAGING_DIR/ExNihilo_BP/LICENSE"
cp "$ROOT_DIR/LICENSE" "$STAGING_DIR/ExNihilo_RP/LICENSE"

echo "[5/5] Creating archives..."
mkdir -p "$DIST_DIR"
rm -f "$ARCHIVE_PATH" "$MCADDON_PATH"
(
  cd "$STAGING_DIR"
  zip -rq "$ARCHIVE_PATH" ExNihilo_BP ExNihilo_RP
  zip -rq "$MCADDON_PATH" ExNihilo_BP ExNihilo_RP
)

echo "Done: $ARCHIVE_PATH"
echo "Done: $MCADDON_PATH"