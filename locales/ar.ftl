search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    تحميل: {$download}</blockquote>
search-empty-results = لا توجد نتائج
search-unknown-error = حدث خطأ أثناء البحث
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>البذور: {$seeds} ({$maxSeeds}),  النظراء: {$peers} ({$maxPeers})</i>
    <i>السرعة: {$speed}</i>
    <i>الوقت المتبقي: {$eta}</i>
    <i>التقدم: {$progress}</i>
    ---
    إزالة: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>التقدم: {$progress}</i>
    ---
    الملفات: {$files}
    إزالة: {$remove}
torrent-unsupported-tracker-error = المتتبع غير مدعوم
torrent-download-error = حدث خطأ أثناء إضافة التورنت
torrent-remove-error = حدث خطأ أثناء إزالة التورنت
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>الحجم: {$size}</i>
    ---
    تحميل: {$download}
torrent-files-empty = لا توجد ملفات
torrent-files-error = حدث خطأ أثناء استرداد الملفات
torrent-file-uploading = جارٍ التحميل، يرجى الانتظار...
torrent-file-compressing = جارٍ ضغط الفيديو، يرجى الانتظار... {$progress}%
torrent-file-will-be-compressed = سيتم ضغطه
torrent-file-too-big = الملف كبير جدًا!
torrent-file-error = حدث خطأ أثناء إرسال الملف
torrent-file-empty = لم يتم العثور على الملف
