search-message =
    <b>{$title}</b>
    ---
    {$size}  |  {$seeds}/{$peers}  |  {DATETIME($publishDate)}
    ---
    Download: {$download}
search-empty-results = No results
search-unknown-error = An error occurred during the search
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Speed: {$speed}
    ETA: {$eta}
    Progress: {$progress}
    ---
    Remove: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    Progress: {$progress}
    ---
    Remove: {$remove}
torrent-unsupported-tracker-error = Tracker not supported
torrent-download-error = An error occurred while adding the torrent
torrent-remove-error = An error occurred while removing the torrent
