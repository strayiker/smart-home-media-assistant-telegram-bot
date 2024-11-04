search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    Download: {$download}</blockquote>
search-empty-results = No results
search-unknown-error = Error occurred during the search
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})</i>
    <i>Speed: {$speed}</i>
    <i>ETA: {$eta}</i>
    <i>Progress: {$progress}</i>
    ---
    Remove: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>Progress: {$progress}</i>
    ---
    Files: {$files}
    Remove: {$remove}
torrent-unsupported-tracker-error = Tracker not supported
torrent-download-error = Error occurred while adding the torrent
torrent-remove-error = Error occurred while removing the torrent
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>Size: {$size}</i>
    ---
    Download: {$download}
torrent-files-empty = No files
torrent-files-error = Error occurred while retrieving files
torrent-file-uploading = Uploading, please wait...
torrent-file-compressing = Compressing video, please wait... {$progress}%
torrent-file-will-be-compressed = will be compressed
torrent-file-too-big = File is too big!
torrent-file-error = Error occurred while sending file
torrent-file-empty = File not found
