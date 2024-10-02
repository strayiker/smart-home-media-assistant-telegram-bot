search-message =
    <b>{$title}</b>
    ---
    {$size}  |  {$seeds}/{$peers}  |  {DATETIME($publishDate)}
    ---
    下载: {$download}
search-empty-results = 没有结果
search-unknown-error = 搜索过程中发生错误
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    做种数: {$seeds} ({$maxSeeds}),  用户: {$peers} ({$maxPeers})
    速度: {$speed}
    预计时间: {$eta}
    进度: {$progress}
    ---
    删除: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    进度: {$progress}
    ---
    删除: {$remove}
torrent-unsupported-tracker-error = 不支持的跟踪器
torrent-download-error = 添加种子时发生错误
torrent-remove-error = 删除种子时发生错误
