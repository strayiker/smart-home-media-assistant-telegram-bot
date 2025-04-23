auth-enter-secret = 🔒 ボットにアクセスするためのシークレットキーを入力してください:
auth-success = ✅ 認証に成功しました！ようこそ。
auth-fail = ❌ 間違ったキーです。もう一度お試しください:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    ダウンロード: {$download}</blockquote>
search-empty-results = 結果がありません
search-unknown-error = 検索中にエラーが発生しました
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    シード: {$seeds} ({$maxSeeds}),  ピア: {$peers} ({$maxPeers})
    速度: {$speed}
    残り時間: {$eta}
    進行状況: {$progress}
    ---
    削除: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    進行状況: {$progress}
    ---
    ファイル: {$files}
    削除: {$remove}</blockquote>
torrent-unsupported-tracker-error = トラッカーはサポートされていません
torrent-download-error = トレントの追加中にエラーが発生しました
torrent-remove-error = トレントの削除中にエラーが発生しました
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    サイズ: {$size}
    ---
    ダウンロード: {$download}</blockquote>
torrent-files-empty = ファイルがありません
torrent-files-error = ファイルの取得中にエラーが発生しました
torrent-file-uploading = アップロード中、お待ちください...
torrent-file-compressing = ビデオを圧縮中、お待ちください... {$progress}%
torrent-file-will-be-compressed = 圧縮されます
torrent-file-too-big = ファイルが大きすぎます！
torrent-file-error = ファイルの送信中にエラーが発生しました
torrent-file-empty = ファイルが見つかりません
