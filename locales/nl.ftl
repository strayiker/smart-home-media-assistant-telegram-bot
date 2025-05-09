auth-enter-secret = 🔒 Voer de geheime sleutel in om toegang te krijgen tot de bot:
auth-success = ✅ Authenticatie geslaagd! Welkom.
auth-fail = ❌ Verkeerde sleutel. Probeer het opnieuw:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Download: {$download}</blockquote>
search-empty-results = Geen resultaten
search-unknown-error = Fout opgetreden tijdens het zoeken
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Snelheid: {$speed}
    ETA: {$eta}
    Voortgang: {$progress}
    ---
    Verwijderen: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Voortgang: {$progress}
    ---
    Bestanden: {$files}
    Verwijderen: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker niet ondersteund
torrent-download-error = Fout opgetreden bij het toevoegen van de torrent
torrent-remove-error = Fout opgetreden bij het verwijderen van de torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Grootte: {$size}
    ---
    Download: {$download}</blockquote>
torrent-files-empty = Geen bestanden
torrent-files-error = Fout opgetreden bij het ophalen van bestanden
torrent-file-uploading = Uploaden, even geduld aub...
torrent-file-compressing = Video wordt gecomprimeerd, even geduld aub... {$progress}%
torrent-file-will-be-compressed = zal worden gecomprimeerd
torrent-file-too-big = Bestand is te groot!
torrent-file-error = Fout opgetreden bij het verzenden van het bestand
torrent-file-empty = Bestand niet gevonden
