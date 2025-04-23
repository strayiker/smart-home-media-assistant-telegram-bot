auth-enter-secret = 🔒 봇에 액세스하려면 비밀 키를 입력하세요:
auth-success = ✅ 인증 성공! 환영합니다.
auth-fail = ❌ 잘못된 키입니다. 다시 시도하세요:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    다운로드: {$download}</blockquote>
search-empty-results = 결과 없음
search-unknown-error = 검색 중 오류 발생
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    시드: {$seeds} ({$maxSeeds}),  피어: {$peers} ({$maxPeers})
    속도: {$speed}
    예상 시간: {$eta}
    진행 상황: {$progress}
    ---
    제거: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    진행 상황: {$progress}
    ---
    파일: {$files}
    제거: {$remove}</blockquote>
torrent-unsupported-tracker-error = 트래커가 지원되지 않음
torrent-download-error = 토렌트 추가 중 오류 발생
torrent-remove-error = 토렌트 제거 중 오류 발생
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    크기: {$size}
    ---
    다운로드: {$download}</blockquote>
torrent-files-empty = 파일 없음
torrent-files-error = 파일 검색 중 오류 발생
torrent-file-uploading = 업로드 중, 잠시 기다려 주십시오...
torrent-file-compressing = 동영상 압축 중, 잠시 기다려 주십시오... {$progress}%
torrent-file-will-be-compressed = 압축될 예정
torrent-file-too-big = 파일이 너무 큼!
torrent-file-error = 파일 전송 중 오류 발생
torrent-file-empty = 파일을 찾을 수 없음
