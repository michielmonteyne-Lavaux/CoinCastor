#!/bin/bash
# sync_fotos.sh — voeg nieuwe foto's toe aan coincastor.be
#
# Gebruik:
#   1. Sleep foto's naar fotos/nieuw/vakantiehuis/ of fotos/nieuw/omgeving/
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

base = "$NIEUW_DIR"
manifest_path = "$MANIFEST"
extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

photos = []
for cat in ['vakantiehuis', 'omgeving']:
    folder = os.path.join(base, cat)
    if not os.path.isdir(folder):
        continue
    for fname in sorted(os.listdir(folder)):
        if fname.startswith('.'):
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext in extensions:
            key = f"fotos/nieuw/{cat}/{fname}"
            caption = os.path.splitext(fname)[0].replace('_', ' ').replace('-', ' ').title()
            photos.append({"file": key, "caption": caption, "category": cat})

with open(manifest_path, 'w') as f:
    json.dump(photos, f, ensure_ascii=False, indent=2)

print(f"✅ Manifest bijgewerkt: {len(photos)} foto('s)")
vakantiehuis = sum(1 for p in photos if p['category'] == 'vakantiehuis')
omgeving = sum(1 for p in photos if p['category'] == 'omgeving')
print(f"   Vakantiehuis: {vakantiehuis}  |  Omgeving: {omgeving}")
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
echo "   Tip: captions aanpassen? Bewerk fotos/manifest.json en run dit script opnieuw."
