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
    <b>{$title}</b>
    ---
    Сиды: {$seeds} ({$maxSeeds}),  Пиры: {$peers} ({$maxPeers})
    Скорость: {$speed}
    Оставшееся время: {$eta}
    Прогресс: {$progress}
    ---
    Удалить: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    Прогресс: {$progress}
    ---
    Файлы: {$files}
    Удалить: {$remove}
torrent-unsupported-tracker-error = Трекер не поддерживается
torrent-download-error = Произошла ошибка при добавлении торрента
torrent-remove-error = Произошла ошибка при удалении торрента
torrent-file-message =
    <b>{$name}</b>
    ---
    Размер: {$size}
    ---
    Скачать: {$download}
torrent-files-empty = Нет файлов
torrent-files-error = Произошла ошибка при получении файлов
torrent-file-uploading = Отправка, подождите...
torrent-file-compressing = Сжатие видео, подождите... {$progress}%
torrent-file-will-be-compressed = будет сжат
torrent-file-too-big = Файл слишком большой!
torrent-file-error = Произошла ошибка при отправке файла
torrent-file-empty = Файл не найден
