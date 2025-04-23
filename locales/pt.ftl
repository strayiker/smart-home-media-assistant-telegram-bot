auth-enter-secret = 🔒 Insira a chave secreta para acessar o bot:
auth-success = ✅ Autenticação bem-sucedida! Bem-vindo.
auth-fail = ❌ Chave incorreta. Tente novamente:
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Download: {$download}</blockquote>
search-empty-results = Nenhum resultado
search-unknown-error = Ocorreu um erro durante a pesquisa
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Velocidade: {$speed}
    ETA: {$eta}
    Progresso: {$progress}
    ---
    Remover: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Progresso: {$progress}
    ---
    Arquivos: {$files}
    Remover: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker não suportado
torrent-download-error = Erro ao adicionar o torrent
torrent-remove-error = Erro ao remover o torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Tamanho: {$size}
    ---
    Download: {$download}</blockquote>
torrent-files-empty = Nenhum arquivo
torrent-files-error = Erro ao recuperar arquivos
torrent-file-uploading = Carregando, por favor aguarde...
torrent-file-compressing = Compactando vídeo, por favor aguarde... {$progress}%
torrent-file-will-be-compressed = será compactado
torrent-file-too-big = Arquivo muito grande!
torrent-file-error = Erro ao enviar arquivo
torrent-file-empty = Arquivo não encontrado
