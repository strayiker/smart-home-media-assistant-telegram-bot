# TDD: Перенос метаданных торрентов из qBittorrent tags в БД

**PRD:** [PRD-qbittorrent-tags-to-db.md](PRD-qbittorrent-tags-to-db.md)
**Статус:** Draft

## 1. Обзор решения

Ввести постоянное хранение метаданных торрента в SQLite через MikroORM. Метаданные будут включать `torrentHash`, `uid`, `chatId`, `searchEngine`, `trackerId`, `createdAt` и др. Локаль больше не хранится в `TorrentMeta`: она определяется из данных Telegram пользователя (`ctx.from.language_code`) и сохраняется в отдельной таблице настроек чата. Все операции, ранее использующие qBittorrent tags, заменяются на обращения к БД. Теги qBittorrent остаются исключительно пользовательскими, без служебных значений.

## 2. Архитектура

### 2.1 Компоненты и изменения

| Компонент  | Изменения              | Новый/Изменён |
| ---------- | ---------------------- | ------------- |
| Entity     | `TorrentMeta`          | Новый         |
| Entity     | `ChatSettings`         | Новый         |
| Migration  | новая миграция         | Новый         |
| Composer   | TorrentsComposer       | Изменён       |
| Middleware | сохранение локали чата | Новый         |
| ORM        | конфигурация миграций  | Без изменений |

### 2.2 Поток данных (to-be)

1. Пользователь отправляет `/dl_<uid>`.
2. Бот скачивает `.torrent`, добавляет в qBittorrent (без тегов).
3. Бот сохраняет запись `TorrentMeta` в БД.
4. Локаль чата сохраняется при каждом входящем сообщении (из `ctx.from.language_code`).
5. Периодическое обновление сообщений использует `torrentHash` → `TorrentMeta` и `chatId` → `ChatSettings.locale`.
6. `/ls_<uid>` и `/rm_<uid>` используют поиск по БД.

## 3. Детальный дизайн

### 3.1 Новая модель данных

**Entity: `TorrentMeta`** (проектный нейминг может быть `TorrentLink`, `TorrentSession` — выбрать единый стиль).

Предлагаемые поля:

- `id` (PK)
- `hash` (string, unique) — хэш торрента в qBittorrent
- `uid` (string, unique или composite) — `trackerName_trackerId`
- `chatId` (number) — чат, для которого добавлен торрент
- `searchEngine` (string) — имя движка, например `rutracker`
- `trackerId` (string) — id торрента на трекере
- `createdAt` (Date)
- `updatedAt` (Date)
  **Entity: `ChatSettings`**
- `chatId` (PK)
- `locale` (string) — нормализованная локаль (по данным Telegram пользователя)
- `createdAt` (Date)
- `updatedAt` (Date)

Примечания:

- `uid` может быть составным ключом `searchEngine + trackerId`. Можно хранить отдельно и собирать на уровне логики.
- Индексы: `hash` (unique), `uid` (unique), `chatId` (index).

### 3.2 Изменения в TorrentsComposer

#### Места использования тегов

- Добавление: сейчас записывает `uid_` и `i18n_` в теги.
- Поиск по uid: `getTorrentByUid` использует фильтр `tag=uid_`.
- Форматирование: `formatTorrent` извлекает `locale` и `uid` из тегов.

#### Новые источники данных

- `uid` берётся из `TorrentMeta`.
- `locale` берётся из `ChatSettings` по `chatId`.
- `getTorrentByUid` заменяется на запрос к БД по `uid`.
- Для `formatTorrent` и сообщений использовать `TorrentMeta` по `hash` и `ChatSettings` по `chatId`.

### 3.3 API и сервисы

Рекомендуется добавить слой доступа к данным (например, `TorrentMetaRepository` или `TorrentMetaService`) для:

- `createFromDownload({ hash, uid, chatId, searchEngine, trackerId })`
- `getByUid(uid)`
- `getByHashes(hashes[])`
- `removeByHash(hash)`
- `removeByUid(uid)`

Рекомендуется добавить `ChatSettingsRepository` для:

- `upsertLocale(chatId, locale)`
- `getLocale(chatId)`

### 3.4 Псевдокод ключевых операций

**Добавление торрента:**

```
uid = `${se.name}_${id}`
hash = qBittorrent.addTorrents({ torrents: [torrent] })
TorrentMeta.create({ hash, uid, chatId, searchEngine: se.name, trackerId: id })
```

**Команда /ls:**

```
meta = TorrentMeta.findByUid(uid)
qbFiles = qBittorrent.getTorrentFiles(meta.hash)
```

**Команда /rm:**

```
meta = TorrentMeta.findByUid(uid)
qBittorrent.deleteTorrents([meta.hash])
TorrentMeta.removeByHash(meta.hash)
```

**Форматирование сообщений:**

```
meta = TorrentMeta.findByHash(torrent.hash)
locale = ChatSettings.getLocale(chatId) ?? 'en'
uid = meta?.uid
```

## 4. Альтернативы и обоснование

| Вариант          | Плюсы                  | Минусы                         | Решение  |
| ---------------- | ---------------------- | ------------------------------ | -------- |
| A: Оставить теги | Просто                 | Ненадёжно, внешняя зависимость | Отклонён |
| B: Хранить в БД  | Надёжно, контролируемо | Нужно миграция                 | ✓ Выбран |
| C: Redis         | Быстро                 | Добавляет инфраструктуру       | Отклонён |

## 5. Зависимости

- MikroORM (уже используется)
- Новая миграция
- SQLite

## 6. Тестирование

### 6.1 Unit

- Маппинг `uid` ↔ `hash`
- Форматирование сообщений при отсутствии `meta`

### 6.2 Интеграционные

- Создание `TorrentMeta` при добавлении
- `/ls` и `/rm` работают без тегов

### 6.3 Ручные проверки

- Добавить торрент → проверить БД → проверить сообщения
- Рестарт бота → сообщения корректно продолжаются

## 7. Миграция и совместимость

- Добавить новые таблицы `torrent_meta` и `chat_settings`.
- Миграция из qBittorrent tags не выполняется (полный отказ от tag-хаков).
- После релиза все новые торренты будут корректно сохранять метаданные в БД.

## 8. Логирование и Observability

- Логировать создание/удаление `TorrentMeta`.
- Логировать случаи отсутствия метаданных для торрента.

## 9. Риски и митигация

| Риск                    | Вероятность | Влияние | Митигация                                                                    |
| ----------------------- | ----------- | ------- | ---------------------------------------------------------------------------- |
| Потеря связки uid↔hash | M           | H       | Логирование отсутствия метаданных; пользователь может пере-добавить торрент  |
| Несоответствие locale   | M           | M       | Локаль определяется из Telegram и хранится в ChatSettings с fallback на `en` |
| Рост таблицы            | L           | M       | TTL/архивирование удалённых                                                  |

## 10. Открытые вопросы

- Нужна ли авто-миграция данных из старых тегов при старте? (предлагается нет)
- Требуется ли мягкое удаление?
- Нужно ли хранить историю завершённых торрентов?

## 11. Затрагиваемые файлы (предварительно)

- [../src/composers/TorrentsComposer.ts](../src/composers/TorrentsComposer.ts)
- [../src/entities/](../src/entities/)
- [../src/migrations/](../src/migrations/)
- [../src/orm.ts](../src/orm.ts)
