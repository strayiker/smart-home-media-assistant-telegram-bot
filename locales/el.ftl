search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    Λήψη: {$download}</blockquote>
search-empty-results = Δεν βρέθηκαν αποτελέσματα
search-unknown-error = Παρουσιάστηκε σφάλμα κατά την αναζήτηση
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>Σπόροι: {$seeds} ({$maxSeeds}),  Συμμετέχοντες: {$peers} ({$maxPeers})</i>
    <i>Ταχύτητα: {$speed}</i>
    <i>Υπολειπόμενος Χρόνος: {$eta}</i>
    <i>Πρόοδος: {$progress}</i>
    ---
    Αφαίρεση: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>Πρόοδος: {$progress}</i>
    ---
    Αρχεία: {$files}
    Αφαίρεση: {$remove}
torrent-unsupported-tracker-error = Ο tracker δεν υποστηρίζεται
torrent-download-error = Παρουσιάστηκε σφάλμα κατά την προσθήκη του torrent
torrent-remove-error = Παρουσιάστηκε σφάλμα κατά την αφαίρεση του torrent
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>Μέγεθος: {$size}</i>
    ---
    Λήψη: {$download}
torrent-files-empty = Δεν υπάρχουν αρχεία
torrent-files-error = Παρουσιάστηκε σφάλμα κατά την ανάκτηση των αρχείων
torrent-file-uploading = Γίνεται μεταφόρτωση, παρακαλώ περιμένετε...
torrent-file-compressing = Συμπίεση βίντεο, παρακαλώ περιμένετε... {$progress}%
torrent-file-will-be-compressed = θα συμπιεστεί
torrent-file-too-big = Το αρχείο είναι πολύ μεγάλο!
torrent-file-error = Παρουσιάστηκε σφάλμα κατά την αποστολή του αρχείου
torrent-file-empty = Δεν βρέθηκε αρχείο
