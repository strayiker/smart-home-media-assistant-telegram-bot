auth-enter-secret = 🔒 Írja be a titkos kulcsot a bot eléréséhez:
auth-success = ✅ Sikeres hitelesítés! Üdvözöljük.
auth-fail = ❌ Hibás kulcs. Kérjük, próbálja újra:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Letöltés: {$download}</blockquote>
search-empty-results = Nincs találat
search-unknown-error = Hiba történt a keresés során
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seedek: {$seeds} ({$maxSeeds}),  Peerek: {$peers} ({$maxPeers})
    Sebesség: {$speed}
    Várható idő: {$eta}
    Folyamat: {$progress}
    ---
    Eltávolítás: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Folyamat: {$progress}
    ---
    Fájlok: {$files}
    Eltávolítás: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker nem támogatott
torrent-download-error = Hiba történt a torrent hozzáadásakor
torrent-remove-error = Hiba történt a torrent eltávolításakor
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Méret: {$size}
    ---
    Letöltés: {$download}</blockquote>
torrent-files-empty = Nincs fájl
torrent-files-error = Hiba történt a fájlok lekérésekor
torrent-file-uploading = Feltöltés, kérjük várjon...
torrent-file-compressing = Videó tömörítése, kérjük várjon... {$progress}%
torrent-file-will-be-compressed = tömörítve lesz
torrent-file-too-big = A fájl túl nagy!
torrent-file-error = Hiba történt a fájl küldésekor
torrent-file-empty = A fájl nem található
