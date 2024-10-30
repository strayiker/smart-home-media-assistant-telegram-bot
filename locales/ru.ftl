search-message =
    <b>{$title}</b> {$detailsLink}
    ---
    {$size}  |  {$seeds}/{$peers}  |  {DATETIME($publishDate)}
    ---
    Скачать: {$download}
search-empty-results = Нет результатов
search-unknown-error = Произошла ошибка во время поиска
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    Сиды: {$seeds} ({$maxSeeds}),  Пиры: {$peers} ({$maxPeers})
    Скорость: {$speed}
    Ожидаемое время: {$eta}
    Прогресс: {$progress}
    ---
    Удалить: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    Прогресс: {$progress}
    ---
    Удалить: {$remove}
torrent-unsupported-tracker-error = Трекер не поддерживается
torrent-download-error = Произошла ошибка при добавлении торрента
torrent-remove-error = Произошла ошибка при удалении торрента
