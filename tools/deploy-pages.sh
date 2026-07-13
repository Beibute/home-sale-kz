#!/usr/bin/env bash
# Деплой сайта на GitHub Pages (репозиторий Beibute/home-sale-kz).
# Требует: gh авторизован как Beibute (gh auth login) + gh auth setup-git.
# Использование: bash tools/deploy-pages.sh
set -euo pipefail

REPO_URL="https://github.com/Beibute/home-sale-kz.git"
LIVE="https://beibute.github.io/home-sale-kz/"
SRC="$(cd "$(dirname "$0")/.." && pwd)"   # корень проекта home-sale-kz
TMP="$(mktemp -d)"

echo "→ клонирую $REPO_URL"
git clone -q "$REPO_URL" "$TMP"

echo "→ синхронизирую файлы сайта"
# удаляем всё, кроме .git, и копируем свежие файлы проекта
find "$TMP" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r "$SRC"/. "$TMP"/
rm -rf "$TMP/.git/.." 2>/dev/null || true   # защита от вложенного .git из SRC (его нет)
touch "$TMP/.nojekyll"

cd "$TMP"
git add -A
if git diff --cached --quiet; then
  echo "нет изменений — деплой не требуется"
  rm -rf "$TMP"; exit 0
fi
git commit -q -m "deploy: обновление сайта $(date -u +%F)"
git push -q origin main
echo "✓ задеплоено → $LIVE (сборка Pages ~1 мин)"
rm -rf "$TMP"
