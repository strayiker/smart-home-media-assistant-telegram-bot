auth-enter-secret = 🔒 Enter the secret key to access the bot:
auth-success = ✅ Authentication successful! Welcome.
auth-fail = ❌ Incorrect key. Please try again:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Download: {$download}</blockquote>
search-empty-results = No results
search-unknown-error = Error occurred during the search
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Speed: {$speed}
    ETA: {$eta}
    Progress: {$progress}
    ---
    Remove: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Progress: {$progress}
    ---
    Files: {$files}
    Remove: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker not supported
torrent-download-error = Error occurred while adding the torrent
torrent-remove-error = Error occurred while removing the torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Size: {$size}
    ---
    Download: {$download}</blockquote>
torrent-files-empty = No files
torrent-files-error = Error occurred while retrieving files
torrent-file-uploading = Uploading, please wait...
torrent-file-compressing = Compressing video, please wait... {$progress}%
torrent-file-will-be-compressed = will be compressed
torrent-file-too-big = File is too big!
torrent-file-error = Error occurred while sending file
torrent-file-empty = File not found
