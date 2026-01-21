# Конвенция именования файлов

## Правила

### Файлы, экспортирующие класс
Если файл экспортирует один главный класс — имя файла должно соответствовать имени класса в PascalCase.

**Примеры:**
- Класс `ChatSession` → файл `ChatSession.ts`
- Класс `CommandsRegistry` → файл `CommandsRegistry.ts`
- Класс `QBittorrentClient` → файл `QBittorrentClient.ts`

### Файлы модулей, утилит и функций
Если файл экспортирует функции, константы, типы или несколько сущностей — имя файла в camelCase.

**Примеры:**
- Утилита форматирования → файл `formatBytes.ts`
- Конфигурация → файл `config.ts` (но не класс)
- Сервис без явного класса-экспорта → `searchService.ts`
- Набор типов → файл `types.ts`

### Папки
Все папки — camelCase.

**Примеры:**
- `domain/services/`
- `presentation/bot/`
- `infrastructure/session/`
- `utils/`

## Таблица примеров

| Тип | Старое имя (если было) | Новое имя | Обоснование |
|-----|-----------------------|------------|-------------|
| Класс | `ChatSession.ts` | `ChatSession.ts` | Экспортирует класс `ChatSession` |
| Класс | `AppError.ts` | `AppError.ts` | Экспортирует класс `AppError` |
| Утилита | `Logger.ts` (если это просто функции) | `logger.ts` | Экспортирует функции/константы |
| Утилита | `Config.ts` (если это просто объект) | `config.ts` | Экспортирует конфиг-объект |
| Модуль | `di.ts` | `di.ts` | Уже camelCase, ничего не менять |
| Сервис | `TorrentService.ts` | `TorrentService.ts` | Экспортирует класс сервиса |
| Репозиторий | `TorrentMetaRepository.ts` | `TorrentMetaRepository.ts` | Экспортирует класс репозитория |

## Особые случаи

### Миграции
Файлы миграций сохраняют префикс с таймстемпом — это часть имени.
- `Migration20260120090000CreateChatSession.ts` → оставить как есть (временной префикс)

### Тесты
Тестовые файлы следуют тем же правилам:
- `ChatSession.test.ts` (если тестирует класс `ChatSession`)
- `formatBytes.test.ts` (если тестирует утилиту `formatBytes.ts`)

## Как определить правило

1. Открыть файл и посмотреть главный экспорт
2. Если это `export class Something` → PascalCase имя файла
3. Если это `export function` / `export const` / несколько экспортов → camelCase имя файла

## Автоматизация

При переименовании файлов:
- Использовать `git mv` для сохранения истории
- На macOS для case-only переименований использовать temp-rename: `git mv Old.ts Old.tmp && git mv Old.tmp old.ts`
- После переименования обновить импорты с помощью скрипта `scripts/update-imports.js`
