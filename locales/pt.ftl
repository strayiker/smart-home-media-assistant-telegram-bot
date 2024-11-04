search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    Download: {$download}</blockquote>
search-empty-results = Nenhum resultado
search-unknown-error = Ocorreu um erro durante a pesquisa
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})</i>
    <i>Velocidade: {$speed}</i>
    <i>ETA: {$eta}</i>
    <i>Progresso: {$progress}</i>
    ---
    Remover: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>Progresso: {$progress}</i>
    ---
    Arquivos: {$files}
    Remover: {$remove}
torrent-unsupported-tracker-error = Tracker não suportado
torrent-download-error = Erro ao adicionar o torrent
torrent-remove-error = Erro ao remover o torrent
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>Tamanho: {$size}</i>
    ---
    Download: {$download}
torrent-files-empty = Nenhum arquivo
torrent-files-error = Erro ao recuperar arquivos
torrent-file-uploading = Carregando, por favor aguarde...
torrent-file-compressing = Compactando vídeo, por favor aguarde... {$progress}%
torrent-file-will-be-compressed = será compactado
torrent-file-too-big = Arquivo muito grande!
torrent-file-error = Erro ao enviar arquivo
torrent-file-empty = Arquivo não encontrado
