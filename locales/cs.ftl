auth-enter-secret = 🔒 Zadejte tajný klíč pro přístup k botovi:
auth-success = ✅ Ověření bylo úspěšné! Vítejte.
auth-fail = ❌ Nesprávný klíč. Zkuste to prosím znovu:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Stáhnout: {$download}</blockquote>
search-empty-results = Žádné výsledky
search-unknown-error = Při hledání došlo k chybě
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seedů: {$seeds} ({$maxSeeds}),  Peerů: {$peers} ({$maxPeers})
    Rychlost: {$speed}
    ETA: {$eta}
    Pokrok: {$progress}
    ---
    Odstranit: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Pokrok: {$progress}
    ---
    Soubory: {$files}
    Odstranit: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker není podporován
torrent-download-error = Při přidávání torrentu došlo k chybě
torrent-remove-error = Při odebírání torrentu došlo k chybě
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Velikost: {$size}
    ---
    Stáhnout: {$download}</blockquote>
torrent-files-empty = Žádné soubory
torrent-files-error = Při načítání souborů došlo k chybě
torrent-file-uploading = Nahrávání, prosím, čekejte...
torrent-file-compressing = Komprimace videa, prosím, čekejte... {$progress}%
torrent-file-will-be-compressed = bude komprimováno
torrent-file-too-big = Soubor je příliš velký!
torrent-file-error = Při odesílání souboru došlo k chybě
torrent-file-empty = Soubor nebyl nalezen
