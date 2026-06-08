#!/bin/bash
# sync_fotos.sh — voeg nieuwe foto's toe aan coincastor.be
#
# Gebruik:
#   1. Sleep foto's naar fotos/nieuw/
#   2. Voer uit: bash scripts/sync_fotos.sh
#   3. Klaar — foto's zijn live op coincastor.be na ~1 minuut

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
NIEUW_DIR="$REPO_DIR/fotos/nieuw"
MANIFEST="$REPO_DIR/fotos/manifest.json"

echo "📸 Coincastor foto-sync"
echo "========================"

if [ ! -d "$NIEUW_DIR" ]; then
  echo "❌ Map fotos/nieuw/ niet gevonden."
  exit 1
fi

python3 - <<EOF
import json, os

nieuw_dir = "$NIEUW_DIR"
manifest_path = "$MANIFEST"
extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

photos = []
for fname in sorted(os.listdir(nieuw_dir)):
    if fname.startswith('.'):
        continue
    ext = os.path.splitext(fname)[1].lower()
    if ext in extensions:
        key = f"fotos/nieuw/{fname}"
        caption = os.path.splitext(fname)[0]
        photos.append({"file": key, "caption": caption})

with open(manifest_path, 'w') as f:
    json.dump(photos, f, ensure_ascii=False, indent=2)

print(f"✅ Manifest bijgewerkt: {len(photos)} foto('s)")
EOF

if [ $? -ne 0 ]; then
  echo "❌ Fout bij het genereren van manifest.json"
  exit 1
fi

cd "$REPO_DIR"

if git diff --quiet && git diff --cached --quiet; then
  echo "ℹ️  Geen wijzigingen gevonden — niets te pushen."
  exit 0
fi

git add fotos/nieuw/ fotos/manifest.json
git commit -m "Voeg nieuwe foto's toe aan galerij"
git push

echo ""
echo "🚀 Klaar! Foto's zijn live op coincastor.be over ~1 minuut."
