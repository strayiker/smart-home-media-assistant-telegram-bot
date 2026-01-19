# TDD: Команда списка торрентов (/torrents) с inline-действиями

## 1. Overview

Цель: добавить команду `/torrents`, которая показывает список торрентов текущего чата, с inline-кнопками для просмотра файлов и удаления торрента. Реализация должна быть совместима с текущей архитектурой `TorrentsComposer` и переиспользовать существующие операции `/ls_<uid>` и `/rm_<uid>`.

Ключевой принцип: список строится из БД (`TorrentMeta`) + актуальные статусы из qBittorrent (по hash).

## 2. Existing Code Touchpoints

### 2.1 TorrentsComposer

- Уже содержит логику:
  - `/ls_<uid>` → `handleListFilesCommand()`
  - `/rm_<uid>` → `handleRemoveCommand()`
  - форматирование торрента `formatTorrent()` (используется для фоновых сообщений).

### 2.2 Репозитории

- `TorrentMetaRepository` содержит методы `getByHashes`, `getByUid`, `removeByHash`.
- Для новой команды понадобится метод: `getByChatId(chatId)`.

### 2.3 Локаль

- `ChatSettingsRepository.getLocale(chatId)` уже существует.
- Внутри команды `/torrents` и callback handlers нужно использовать эту локаль для Fluent.

## 3. API / Interaction Design

### 3.1 Command

- `/torrents` (без аргументов)
- Возвращает сообщение с текущей страницей списка (page=1).

### 3.2 Callback data

Используем префикс `torrents:` для изоляции.

- `torrents:page:<page>` — перейти на страницу.
- `torrents:refresh:<page>` — обновить текущую страницу.
- `torrents:files:<uid>:<page>` — показать файлы (через существующую логику), затем оставить список как есть.
- `torrents:remove:<uid>:<page>` — удалить торрент, затем обновить список.

Ограничение Telegram: callback_data до 64 байт. Форматы выше короткие, `uid` вида `tracker_id` обычно компактный.

## 4. Data Flow

### 4.1 Список

1. Получить `chatId` из `ctx.chatId`.
2. Получить `locale` через `ChatSettingsRepository.getLocale(chatId)`.
3. Получить метаданные торрентов чата: `TorrentMetaRepository.getByChatId(chatId)`.
4. Для конкретной страницы выбрать 5 элементов.
5. Извлечь `hashes` и запросить `QBittorrentClient.getTorrents({ hashes })`.
6. Сопоставить `hash -> QBTorrent`.
7. Отрендерить список:
   - текст через Fluent keys
   - клавиатура через `InlineKeyboard`

### 4.2 Files

1. По uid получить hash через `TorrentMetaRepository.getByUid(uid)`.
2. Вызвать существующую `getTorrentFiles(hash)`.
3. Сформировать список файлов через текущий `formatTorrentFile()`.
4. Отправить отдельным сообщением.

### 4.3 Remove

1. По uid получить hash.
2. Вызвать текущую `deleteTorrent(hash)`.
3. Обновить страницу списка (editMessageText).

## 5. UI Rendering

### 5.1 Text rendering

Добавить новые Fluent keys (en + ru минимум):

- `torrents-list-title`
- `torrents-list-empty`
- `torrents-list-empty-hint`
- `torrents-list-error`
- `torrents-item-completed`
- `torrents-item-downloading`
- `torrents-btn-files`
- `torrents-btn-remove`
- `torrents-btn-refresh`
- `torrents-btn-prev`
- `torrents-btn-next`
- `torrents-removed-success`
- `torrents-removed-error`

### 5.2 Keyboard layout

- Для каждого торрента отдельная строка кнопок:
  - Completed: `[Files] [Remove]`
  - Not completed: `[Remove]`
- Внизу навигация:
  - Prev (если page>1)
  - Refresh
  - Next (если page<totalPages)

## 6. Edge Cases

- `ctx.chatId` undefined: команда должна noop или reply с ошибкой (в боте обычно chatId есть).
- Торрент есть в БД, но отсутствует в qBittorrent: показывать как "Не найден" или скрывать. В рамках MVP: скрывать отсутствующие + можно опционально чистить записи (не делаем автосинк без требования).
- Callback приходит на устаревшую страницу: пересчитать totalPages и clamp page.
- Telegram: попытка editMessageText на удалённое сообщение → обработать как в `updateTorrentsMessage` (fallback sendMessage).

## 7. Implementation Plan (High-level)

1. Добавить в `TorrentMetaRepository` метод `getByChatId(chatId)`.
2. Добавить в `TorrentsComposer` обработчик команды `/torrents`.
3. Добавить в `TorrentsComposer` обработчик callback queries для `torrents:*`.
4. Реализовать рендерер списка:
   - `renderTorrentsList(chatId, page)` → `{ text, keyboard }`
5. Добавить локализацию (en/ru).
6. Проверка линтером и сборкой.

## 8. Testing Strategy

### 8.1 Unit tests

Если тестовой инфраструктуры нет — добавить минимальные unit-тесты в существующем стиле (если он есть). Если отсутствует полностью, ограничиться проверками через `yarn build` и ручными сценариями.

Рекомендуемые тестируемые функции:

- `buildCallbackData()` / `parseCallbackData()`
- `paginate(items, page, perPage)`
- `clampPage(page, totalPages)`

### 8.2 Manual QA

- Добавить 2-3 торрента → `/torrents` показывает список.
- Нажать Files на завершённом торренте → список файлов.
- Нажать Remove → торрент удалился, список обновился.
- Проверить пагинацию при 6+ торрентах.
- Проверить локали ru/en.
