auth-enter-secret = 🔒 Bitte geben Sie den geheimen Schlüssel ein, um auf den Bot zuzugreifen:
auth-success = ✅ Authentifizierung erfolgreich! Willkommen.
auth-fail = ❌ Falscher Schlüssel. Bitte versuchen Sie es erneut:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Download: {$download}</blockquote>
search-empty-results = Keine Ergebnisse
search-unknown-error = Fehler bei der Suche aufgetreten
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Geschwindigkeit: {$speed}
    ETA: {$eta}
    Fortschritt: {$progress}
    ---
    Entfernen: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Fortschritt: {$progress}
    ---
    Dateien: {$files}
    Entfernen: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker wird nicht unterstützt
torrent-download-error = Fehler beim Hinzufügen des Torrents aufgetreten
torrent-remove-error = Fehler beim Entfernen des Torrents aufgetreten
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Größe: {$size}
    ---
    Download: {$download}</blockquote>
torrent-files-empty = Keine Dateien
torrent-files-error = Fehler beim Abrufen der Dateien aufgetreten
torrent-file-uploading = Hochladen, bitte warten...
torrent-file-compressing = Video wird komprimiert, bitte warten... {$progress}%
torrent-file-will-be-compressed = wird komprimiert
torrent-file-too-big = Datei ist zu groß!
torrent-file-error = Fehler beim Senden der Datei aufgetreten
torrent-file-empty = Datei nicht gefunden
