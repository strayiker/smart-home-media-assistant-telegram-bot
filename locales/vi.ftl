auth-enter-secret = 🔒 Nhập khóa bí mật để truy cập bot:
auth-success = ✅ Xác thực thành công! Chào mừng.
auth-fail = ❌ Sai khóa. Vui lòng thử lại:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Tải về: {$download}</blockquote>
search-empty-results = Không có kết quả
search-unknown-error = Đã xảy ra lỗi trong quá trình tìm kiếm
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Tốc độ: {$speed}
    ETA: {$eta}
    Tiến trình: {$progress}
    ---
    Xóa: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Tiến trình: {$progress}
    ---
    Tệp: {$files}
    Xóa: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker không được hỗ trợ
torrent-download-error = Đã xảy ra lỗi khi thêm torrent
torrent-remove-error = Đã xảy ra lỗi khi xóa torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Kích thước: {$size}
    ---
    Tải về: {$download}</blockquote>
torrent-files-empty = Không có tệp
torrent-files-error = Đã xảy ra lỗi khi truy xuất tệp
torrent-file-uploading = Đang tải lên, vui lòng chờ...
torrent-file-compressing = Đang nén video, vui lòng chờ... {$progress}%
torrent-file-will-be-compressed = sẽ được nén
torrent-file-too-big = Tệp quá lớn!
torrent-file-error = Đã xảy ra lỗi khi gửi tệp
torrent-file-empty = Không tìm thấy tệp
