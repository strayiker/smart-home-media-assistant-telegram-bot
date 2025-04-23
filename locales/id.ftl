auth-enter-secret = 🔒 Masukkan kunci rahasia untuk mengakses bot:
auth-success = ✅ Otentikasi berhasil! Selamat datang.
auth-fail = ❌ Kunci salah. Silakan coba lagi:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Unduh: {$download}</blockquote>
search-empty-results = Tidak ada hasil
search-unknown-error = Terjadi kesalahan saat mencari
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Kecepatan: {$speed}
    ETA: {$eta}
    Progres: {$progress}
    ---
    Hapus: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Progres: {$progress}
    ---
    File: {$files}
    Hapus: {$remove}</blockquote>
torrent-unsupported-tracker-error = Pelacak tidak didukung
torrent-download-error = Terjadi kesalahan saat menambahkan torrent
torrent-remove-error = Terjadi kesalahan saat menghapus torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Ukuran: {$size}
    ---
    Unduh: {$download}</blockquote>
torrent-files-empty = Tidak ada file
torrent-files-error = Terjadi kesalahan saat mengambil file
torrent-file-uploading = Mengunggah, harap tunggu...
torrent-file-compressing = Mengompresi video, harap tunggu... {$progress}%
torrent-file-will-be-compressed = akan dikompresi
torrent-file-too-big = File terlalu besar!
torrent-file-error = Terjadi kesalahan saat mengirim file
torrent-file-empty = File tidak ditemukan
