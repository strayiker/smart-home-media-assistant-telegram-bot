auth-enter-secret = 🔒 输入密钥以访问机器人：
auth-success = ✅ 认证成功！欢迎。
auth-fail = ❌ 密钥错误，请重试：
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    下載: {$download}</blockquote>
search-empty-results = 沒有結果
search-unknown-error = 搜尋時發生錯誤
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    種子: {$seeds} ({$maxSeeds}),  同伴: {$peers} ({$maxPeers})
    速度: {$speed}
    預計完成時間: {$eta}
    進度: {$progress}
    ---
    移除: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    進度: {$progress}
    ---
    檔案: {$files}
    移除: {$remove}</blockquote>
torrent-unsupported-tracker-error = 不支援的追蹤器
torrent-download-error = 添加種子時發生錯誤
torrent-remove-error = 移除種子時發生錯誤
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    大小: {$size}
    ---
    下載: {$download}</blockquote>
torrent-files-empty = 沒有檔案
torrent-files-error = 檔案檢索時發生錯誤
torrent-file-uploading = 上傳中，請稍候...
torrent-file-compressing = 視頻壓縮中，請稍候... {$progress}%
torrent-file-will-be-compressed = 將被壓縮
torrent-file-too-big = 檔案太大！
torrent-file-error = 傳送檔案時發生錯誤
torrent-file-empty = 未找到檔案
