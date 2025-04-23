auth-enter-secret = 🔒 Entrez la clé secrète pour accéder au bot:
auth-success = ✅ Authentification réussie ! Bienvenue.
auth-fail = ❌ Clé incorrecte. Veuillez réessayer :
search-message =
    <blockquote><b>{$title}</b>
    {$tags}
    ---
    {$size}  |  {$seeds}S · {$peers}L  |  {DATETIME($publishDate)}
    ---
    Télécharger: {$download}</blockquote>
search-empty-results = Aucun résultat
search-unknown-error = Erreur survenue lors de la recherche
torrent-message-in-progress =
    <blockquote><b>{$title}</b>
    ---
    Seeds: {$seeds} ({$maxSeeds}),  Peers: {$peers} ({$maxPeers})
    Vitesse: {$speed}
    ETA: {$eta}
    Progression: {$progress}
    ---
    Supprimer: {$remove}</blockquote>
torrent-message-completed =
    <blockquote><b>{$title}</b>
    ---
    Progression: {$progress}
    ---
    Fichiers: {$files}
    Supprimer: {$remove}</blockquote>
torrent-unsupported-tracker-error = Tracker non pris en charge
torrent-download-error = Erreur lors de l'ajout du torrent
torrent-remove-error = Erreur lors de la suppression du torrent
torrent-file-message =
    <blockquote><b>{$name}</b>
    ---
    Taille: {$size}
    ---
    Télécharger: {$download}</blockquote>
torrent-files-empty = Aucun fichier
torrent-files-error = Erreur lors de la récupération des fichiers
torrent-file-uploading = Téléchargement en cours, veuillez patienter...
torrent-file-compressing = Compression vidéo en cours, veuillez patienter... {$progress}%
torrent-file-will-be-compressed = sera compressé
torrent-file-too-big = Le fichier est trop gros !
torrent-file-error = Erreur lors de l'envoi du fichier
torrent-file-empty = Fichier non trouvé
