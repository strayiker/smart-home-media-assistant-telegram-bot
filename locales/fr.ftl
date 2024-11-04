search-message =
    <blockquote>{$title}
    {$tags}
    ---
    <i>{$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}</i>
    ---
    Télécharger: {$download}</blockquote>
search-empty-results = Aucun résultat
search-unknown-error = Erreur survenue lors de la recherche
torrent-message-in-progress =
    <b>{$title}</b>
    ---
    <i>Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})</i>
    <i>Vitesse: {$speed}</i>
    <i>ETA: {$eta}</i>
    <i>Progression: {$progress}</i>
    ---
    Supprimer: {$remove}
torrent-message-completed =
    <b>{$title}</b>
    ---
    <i>Progression: {$progress}</i>
    ---
    Fichiers: {$files}
    Supprimer: {$remove}
torrent-unsupported-tracker-error = Tracker non pris en charge
torrent-download-error = Erreur lors de l'ajout du torrent
torrent-remove-error = Erreur lors de la suppression du torrent
torrent-file-message =
    <b>{$name}</b>
    ---
    <i>Taille: {$size}</i>
    ---
    Télécharger: {$download}
torrent-files-empty = Aucun fichier
torrent-files-error = Erreur lors de la récupération des fichiers
torrent-file-uploading = Téléchargement en cours, veuillez patienter...
torrent-file-compressing = Compression vidéo en cours, veuillez patienter... {$progress}%
torrent-file-will-be-compressed = sera compressé
torrent-file-too-big = Le fichier est trop gros !
torrent-file-error = Erreur lors de l'envoi du fichier
torrent-file-empty = Fichier non trouvé
