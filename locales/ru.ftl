search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    Скачать: {$download}</blockquote>
search-empty-results = Нет результатов
search-unknown-error = Произошла ошибка во время поиска
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>Сиды: {$seeds} ({$maxSeeds}),  Пиры: {$peers} ({$maxPeers})</i>
    <i>Скорость: {$speed}</i>
    <i>Оставшееся время: {$eta}</i>
    <i>Прогресс: {$progress}</i>
    ---
    Удалить: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>Прогресс: {$progress}</i>
    ---
    Файлы: {$files}
    Удалить: {$remove}
torrent-unsupported-tracker-error = Трекер не поддерживается
torrent-download-error = Произошла ошибка при добавлении торрента
torrent-remove-error = Произошла ошибка при удалении торрента
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>Размер: {$size}</i>
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
