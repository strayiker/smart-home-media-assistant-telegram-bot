search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Λήψη: {$download}</blockquote>
search-empty-results = Δεν βρέθηκαν αποτελέσματα
search-unknown-error = Παρουσιάστηκε σφάλμα κατά την αναζήτηση
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Σπόροι: {$seeds} ({$maxSeeds}),  Συμμετέχοντες: {$peers} ({$maxPeers})
    Ταχύτητα: {$speed}
    Υπολειπόμενος Χρόνος: {$eta}
    Πρόοδος: {$progress}
    ---
    Αφαίρεση: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Πρόοδος: {$progress}
    ---
    Αρχεία: {$files}
    Αφαίρεση: {$remove}</blockquote>
torrent-unsupported-tracker-error = Ο tracker δεν υποστηρίζεται
torrent-download-error = Παρουσιάστηκε σφάλμα κατά την προσθήκη του torrent
torrent-remove-error = Παρουσιάστηκε σφάλμα κατά την αφαίρεση του torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Μέγεθος: {$size}
    ---
    Λήψη: {$download}</blockquote>
torrent-files-empty = Δεν υπάρχουν αρχεία
torrent-files-error = Παρουσιάστηκε σφάλμα κατά την ανάκτηση των αρχείων
torrent-file-uploading = Γίνεται μεταφόρτωση, παρακαλώ περιμένετε...
torrent-file-compressing = Συμπίεση βίντεο, παρακαλώ περιμένετε... {$progress}%
torrent-file-will-be-compressed = θα συμπιεστεί
torrent-file-too-big = Το αρχείο είναι πολύ μεγάλο!
torrent-file-error = Παρουσιάστηκε σφάλμα κατά την αποστολή του αρχείου
torrent-file-empty = Δεν βρέθηκε αρχείο
