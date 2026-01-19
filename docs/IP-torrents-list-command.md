# IP: Команда списка торрентов (/torrents) с inline-действиями

## IP-0. Цель

Реализовать команду `/torrents`, которая показывает список добавленных торрентов текущего чата, и даёт возможность:

- Просмотреть файлы торрента (для завершённых)
- Удалить торрент
- Листать страницы
- Обновлять список

Реализация должна переиспользовать существующие операции получения файлов и удаления, не возвращаясь к тегам qBittorrent.

## IP-1. Инвентаризация зависимостей

Задействованные компоненты:

- `src/composers/TorrentsComposer.ts`
- `src/utils/TorrentMetaRepository.ts`
- `src/utils/ChatSettingsRepository.ts`
- `src/qBittorrent/QBittorrentClient.ts` (через существующие методы композера)
- `locales/en.ftl`, `locales/ru.ftl`

## IP-2. Определение интерфейсов и ограничений

### Команда

- Триггер: `/torrents`

### Callback data форматы

- `torrents:page:<page>`
- `torrents:refresh:<page>`
- `torrents:files:<uid>:<page>`
- `torrents:remove:<uid>:<page>`

Ограничение: callback_data ≤ 64 bytes.

### Параметры пагинации

- `PER_PAGE = 5`

## IP-3. Репозиторий: получить торренты чата

### IP-3.1 Изменить TorrentMetaRepository

Добавить метод:

- `getByChatId(chatId: number): Promise<TorrentMeta[]>`

Требования:

- Сортировка по `createdAt DESC` (или `id DESC`) для предсказуемого отображения.

## IP-4. Рендеринг списка

### IP-4.1 Добавить функции утилиты в TorrentsComposer

Добавить приватные методы:

- `parseTorrentsCallback(data: string)` → `{ action, page, uid? } | null`
- `buildTorrentsList(chatId: number, page: number)` → `{ text: string, keyboard: InlineKeyboard }`

Требования к build:

- Получить locale: `chatSettingsRepository.getLocale(chatId)`.
- Получить metas: `torrentMetaRepository.getByChatId(chatId)`.
- Рассчитать `totalPages`.
- Взять metas для выбранной страницы.
- Достать `hashes` и запросить torrents через существующий `getTorrents(hashes)`.
- Сформировать текст:
  - заголовок `torrents-list-title` (page/totalPages)
  - далее N блоков `torrents-item-*`
  - если нет метаданных → `torrents-list-empty` + `torrents-list-empty-hint`
- Сформировать клавиатуру:
  - на каждый торрент кнопки Files (если completed) и Remove
  - нижний ряд Prev/Refresh/Next

## IP-5. Команда /torrents

### IP-5.1 Добавить обработку bot_command

В существующем `this.on('message::bot_command', ...)` добавить ветку для `/torrents`.

Поведение:

- Если `ctx.chatId` отсутствует → ничего не делать или reply с `torrents-list-error`.
- Иначе: построить список `page=1` и `reply` с `parse_mode: 'HTML'` и `reply_markup`.

## IP-6. Callback handlers

### IP-6.1 Добавить handler callback_query:data

Добавить `this.on('callback_query:data', ...)` в `TorrentsComposer`.

Поведение:

- Если data не начинается с `torrents:` → `next()`.
- Иначе:
  - `ctx.answerCallbackQuery()` для быстрого отклика.
  - Распарсить action/page/uid.
  - Выполнить действие:
    - page/refresh: `editMessageText` текущего сообщения
    - files: отправить список файлов как отдельное сообщение (переиспользовать существующую логику форматирования файлов)
    - remove: удалить торрент и затем обновить список через edit

Примечание: для remove желательно показывать toast:

- success: `torrents-removed-success`
- error: `torrents-removed-error`

## IP-7. Локализация

### IP-7.1 Добавить ключи в locales/en.ftl

Добавить ключи из PRD/TDD.

### IP-7.2 Добавить ключи в locales/ru.ftl

Добавить ключи из PRD/TDD.

## IP-8. Обработка ошибок

- Любая ошибка в сборке списка → reply/edit `torrents-list-error`.
- Торрент meta отсутствует по uid в callbacks → `torrents-removed-error` или `torrents-list-error` (MVP: error toast).
- qBittorrent недоступен → `torrents-list-error`.

## IP-9. Валидация

### IP-9.1 Статическая

- `yarn lint`
- `yarn build`

### IP-9.2 Ручная

- Добавить торренты → `/torrents`.
- Files кнопка на completed → список файлов.
- Remove → удаление + список обновился.
- Пагинация при >5.
- RU/EN локали.

## IP-10. Definition of Done

- `/torrents` доступна и работает.
- Inline-кнопки для Files/Remove работают.
- Пагинация + refresh работают.
- Локализация добавлена минимум для en/ru.
- `yarn lint` и `yarn build` проходят.
