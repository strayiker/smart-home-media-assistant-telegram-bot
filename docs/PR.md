Краткое описание изменений

- Ветка: feat/restructure-src
- Цель: приведение файловой структуры к правилам именования (модули — camelCase, файлы с экспортом класса — PascalCase), перемещение сущностей, утилит, скриптов и presentation/bot.
- Основные изменения: перемещены `src/entities` → `src/domain/entities`, `src/utils` → `src/shared/utils` (частично), `src/qBittorrent` → `src/qbittorrent`, `src/scripts/migrate.ts` → `src/infrastructure/scripts/migrate.ts`, реорганизованы репозитории и тесты.

Проверка локально

1. Установить зависимости и собрать типы:

```bash
yarn install --frozen-lockfile
npx tsc --noEmit
```

2. Запустить тесты:

```bash
yarn test --run
```

Особенности и заметки

- На macOS были применены временные переименования для case-only изменений и очищен индекс git для корректной обработки регистра файлов.
- Скрипты для автоматизации переименований и обновления импортов: `scripts/rename-files.cjs`, `scripts/update-imports.cjs`, `scripts/generate-rename-map-for-batch.cjs`.
- Полная карта переименований: `rename-maps/full-rename-map.csv`. Аудит: `audit/relocation-map.csv`.

Рекомендуемые действия при ревью

- Просмотреть изменения по батчам (коммиты разбиты по логическим группам).
- Прогнать тесты и сборку на CI (Node 22+, Yarn v4, TypeScript strict).
- Обратить внимание на любые оставшиеся импорты без `.js` (скрипты уже обновляют относительные импорты).

Если нужно — открою PR прямо сейчас (создам описание и отметку для ревьюеров).
