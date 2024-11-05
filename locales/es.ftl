search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Descargar: {$download}</blockquote>
search-empty-results = No hay resultados
search-unknown-error = Ocurrió un error durante la búsqueda
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    Semillas: {$seeds} ({$maxSeeds}),  Pares: {$peers} ({$maxPeers})
    Velocidad: {$speed}
    Tiempo estimado: {$eta}
    Progreso: {$progress}
    ---
    Eliminar: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    Progreso: {$progress}
    ---
    Archivos: {$files}
    Eliminar: {$remove}
torrent-unsupported-tracker-error = Tracker no soportado
torrent-download-error = Error al añadir el torrent
torrent-remove-error = Error al eliminar el torrent
torrent-file-message =
    <b>{$name}</b>
    ---
    Tamaño: {$size}
    ---
    Descargar: {$download}
torrent-files-empty = No hay archivos
torrent-files-error = Error al recuperar archivos
torrent-file-uploading = Subiendo, por favor espera...
torrent-file-compressing = Comprimiendo vídeo, por favor espera... {$progress}%
torrent-file-will-be-compressed = será comprimido
torrent-file-too-big = ¡El archivo es demasiado grande!
torrent-file-error = Error al enviar el archivo
torrent-file-empty = Archivo no encontrado
