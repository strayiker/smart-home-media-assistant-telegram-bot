auth-enter-secret = 🔒 Введите секретный ключ для доступа к боту:
auth-success = ✅ Аутентификация успешна! Добро пожаловать.
auth-fail = ❌ Неверный ключ. Пожалуйста, попробуйте ещё раз:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Скачать: {$download}</blockquote>
search-empty-results = Нет результатов
search-unknown-error = Произошла ошибка во время поиска
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Сиды: {$seeds} ({$maxSeeds}),  Пиры: {$peers} ({$maxPeers})
    Скорость: {$speed}
    Оставшееся время: {$eta}
    Прогресс: {$progress}
    ---
    Удалить: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Прогресс: {$progress}
    ---
    Файлы: {$files}
    Удалить: {$remove}</blockquote>
torrent-unsupported-tracker-error = Трекер не поддерживается
torrent-download-error = Произошла ошибка при добавлении торрента
torrent-download-success = ✅ Торрент добавлен
    ---
    Файлы: /ls_{$uid}
    Удалить: /rm_{$uid}
torrent-remove-error = Произошла ошибка при удалении торрента
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Размер: {$size}
    ---
    Скачать: {$download}</blockquote>
torrent-files-empty = Нет файлов
torrent-files-error = Произошла ошибка при получении файлов
torrent-file-uploading = Отправка, подождите...
torrent-file-compressing = Сжатие видео, подождите... {$progress}%
torrent-file-will-be-compressed = будет сжат
torrent-file-too-big = Файл слишком большой!
torrent-file-error = Произошла ошибка при отправке файла
torrent-file-empty = Файл не найден

torrents-list-title = 📋 Ваши торренты (страница {$page}/{$totalPages}):
torrents-list-empty = У вас нет добавленных торрентов.
torrents-list-empty-hint = Используйте поиск для добавления торрентов.
torrents-list-error = Произошла ошибка при получении списка торрентов.

torrents-item-completed =
    <b>{$title}</b>
    Прогресс: {$progress} ✅
    Размер: {$size}
torrents-item-downloading =
    <b>{$title}</b>
    Прогресс: {$progress} ⏳
    Скорость: {$speed}
    Оставшееся время: {$eta}

torrents-btn-files = 📁 Файлы
torrents-btn-remove = 🗑 Удалить
torrents-btn-refresh = 🔄
torrents-btn-prev = ⬅️
torrents-btn-next = ➡️

torrents-removed-success = ✅ Торрент удалён
torrents-removed-error = ❌ Ошибка при удалении торрента

commands.search = Поиск медиа по заголовку или запросу
commands.torrents = Управление торрентами (список / удаление)
commands.download = Запустить загрузку (используйте команду с id)
commands.files = Показать файлы торрента (используйте uid)
commands.preview = Сгенерировать превью (используйте параметры)
commands.thumb = Сгенерировать миниатюру (используйте параметры)
