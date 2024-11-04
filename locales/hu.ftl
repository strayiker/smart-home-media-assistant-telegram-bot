search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    Letöltés: {$download}</blockquote>
search-empty-results = Nincs találat
search-unknown-error = Hiba történt a keresés során
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>Seedek: {$seeds} ({$maxSeeds}),  Peerek: {$peers} ({$maxPeers})</i>
    <i>Sebesség: {$speed}</i>
    <i>Várható idő: {$eta}</i>
    <i>Folyamat: {$progress}</i>
    ---
    Eltávolítás: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>Folyamat: {$progress}</i>
    ---
    Fájlok: {$files}
    Eltávolítás: {$remove}
torrent-unsupported-tracker-error = Tracker nem támogatott
torrent-download-error = Hiba történt a torrent hozzáadásakor
torrent-remove-error = Hiba történt a torrent eltávolításakor
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>Méret: {$size}</i>
    ---
    Letöltés: {$download}
torrent-files-empty = Nincs fájl
torrent-files-error = Hiba történt a fájlok lekérésekor
torrent-file-uploading = Feltöltés, kérjük várjon...
torrent-file-compressing = Videó tömörítése, kérjük várjon... {$progress}%
torrent-file-will-be-compressed = tömörítve lesz
torrent-file-too-big = A fájl túl nagy!
torrent-file-error = Hiba történt a fájl küldésekor
torrent-file-empty = A fájl nem található
