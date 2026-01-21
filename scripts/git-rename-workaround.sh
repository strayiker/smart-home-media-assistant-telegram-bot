#!/bin/bash
#
# Скрипт-обход для переименования файлов только по регистру на macOS
# Проблема: git mv не работает для case-only переименований на case-insensitive FS
#
# Использование:
#   ./scripts/git-rename-workaround.sh src/OldName.ts src/newName.ts
#   ./scripts/git-rename-workaround.sh --dry-run src/OldName.ts src/newName.ts
#

set -e

DRY_RUN=false
if [ "$1" == "--dry-run" ] || [ "$1" == "-d" ]; then
  DRY_RUN=true
  shift
fi

if [ $# -ne 2 ]; then
  echo "Использование: $0 [--dry-run] OLD_PATH NEW_PATH"
  echo "Пример: $0 src/ChatSession.ts src/chatSession.ts"
  exit 1
fi

OLD_PATH="$1"
NEW_PATH="$2"

if [ ! -f "$OLD_PATH" ]; then
  echo "Ошибка: файл не найден: $OLD_PATH"
  exit 1
fi

# Проверяем, это действительно case-only переименование
OLD_DIR=$(dirname "$OLD_PATH")
NEW_DIR=$(dirname "$NEW_PATH")
OLD_BASE=$(basename "$OLD_PATH")
NEW_BASE=$(basename "$NEW_PATH")

if [ "$OLD_DIR" != "$NEW_DIR" ]; then
  echo "Это не case-only переименование, используйте обычный git mv"
  exit 1
fi

OLD_LOWER=$(echo "$OLD_BASE" | tr '[:upper:]' '[:lower:]')
NEW_LOWER=$(echo "$NEW_BASE" | tr '[:upper:]' '[:lower:]')

if [ "$OLD_LOWER" != "$NEW_LOWER" ]; then
  echo "Это не case-only переименование, используйте обычный git mv"
  exit 1
fi

# Генерируем временное имя
TMP_SUFFIX=".tmp-$(date +%s%N)"
TMP_PATH="${OLD_PATH}${TMP_SUFFIX}"

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] git mv \"$OLD_PATH\" \"$TMP_PATH\""
  echo "[dry-run] git mv \"$TMP_PATH\" \"$NEW_PATH\""
  echo "[dry-run] Переименование: $OLD_PATH → $NEW_PATH"
else
  echo "Переименование с временным файлом..."
  git mv "$OLD_PATH" "$TMP_PATH"
  git mv "$TMP_PATH" "$NEW_PATH"
  echo "✓ Переименовано: $OLD_PATH → $NEW_PATH"
fi
