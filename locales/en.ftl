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
torrent-download-success = ✅ Torrent added
    ---
    Files: /ls_{$uid}
    Remove: /rm_{$uid}
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

torrents-list-title = 📋 Your torrents (page {$page}/{$totalPages}):
torrents-list-empty = You have no added torrents.
torrents-list-empty-hint = Use search to add torrents.
torrents-list-error = Error occurred while retrieving torrents list.

torrents-item-completed =
    <b>{$title}</b>
    Progress: {$progress} ✅
    Size: {$size}
torrents-item-downloading =
    <b>{$title}</b>
    Progress: {$progress} ⏳
    Speed: {$speed}
    ETA: {$eta}

torrents-btn-files = 📁 Files
torrents-btn-remove = 🗑 Remove
torrents-btn-refresh = 🔄
torrents-btn-prev = ⬅️
torrents-btn-next = ➡️

torrents-removed-success = ✅ Torrent removed
torrents-removed-error = ❌ Failed to remove torrent

commands.search = Search media by title or query
commands.torrents = Manage your torrents (list / remove)
commands.download = Start a download (use detailed command with id)
commands.files = List files for a torrent (use detailed command with uid)
commands.preview = Generate media preview (use detailed command with params)
commands.thumb = Generate thumbnail (use detailed command with params)
