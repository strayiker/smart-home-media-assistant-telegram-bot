search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    ดาวน์โหลด: {$download}</blockquote>
search-empty-results = ไม่มีผลลัพธ์
search-unknown-error = เกิดข้อผิดพลาดระหว่างการค้นหา
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>เมล็ด: {$seeds} ({$maxSeeds}),  เพื่อน: {$peers} ({$maxPeers})</i>
    <i>ความเร็ว: {$speed}</i>
    <i>เวลาโดยประมาณ: {$eta}</i>
    <i>ความคืบหน้า: {$progress}</i>
    ---
    ลบ: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>ความคืบหน้า: {$progress}</i>
    ---
    ไฟล์: {$files}
    ลบ: {$remove}
torrent-unsupported-tracker-error = ตัวติดตามไม่รองรับ
torrent-download-error = เกิดข้อผิดพลาดขณะเพิ่มทอร์เรนต์
torrent-remove-error = เกิดข้อผิดพลาดขณะลบทอร์เรนต์
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>ขนาด: {$size}</i>
    ---
    ดาวน์โหลด: {$download}
torrent-files-empty = ไม่มีไฟล์
torrent-files-error = เกิดข้อผิดพลาดขณะดึงไฟล์
torrent-file-uploading = กำลังอัปโหลด โปรดรอ...
torrent-file-compressing = กำลังบีบอัดวิดีโอ โปรดรอ... {$progress}%
torrent-file-will-be-compressed = จะถูกบีบอัด
torrent-file-too-big = ไฟล์มีขนาดใหญ่เกินไป!
torrent-file-error = เกิดข้อผิดพลาดขณะส่งไฟล์
torrent-file-empty = ไม่พบไฟล์
