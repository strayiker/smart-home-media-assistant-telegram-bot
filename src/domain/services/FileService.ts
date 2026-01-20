import path from 'node:path';

import type { QBFile } from '../../qBittorrent/models.js';
import type { QBittorrentClient } from '../../qBittorrent/QBittorrentClient.js';
import { formatBytes } from '../../utils/formatBytes.js';
import type { Logger } from '../../utils/Logger.js';
import type { TorrentMetaRepository } from '../../utils/TorrentMetaRepository.js';

export interface FileServiceOptions {
  qBittorrent: QBittorrentClient;
  torrentMetaRepository: TorrentMetaRepository;
  dataPath: string;
  logger: Logger;
}

export class FileService {
  private qBittorrent: QBittorrentClient;
  private torrentMetaRepository: TorrentMetaRepository;
  private dataPath: string;
  private logger: Logger;

  constructor(options: FileServiceOptions) {
    this.qBittorrent = options.qBittorrent;
    this.torrentMetaRepository = options.torrentMetaRepository;
    this.dataPath = options.dataPath;
    this.logger = options.logger;
  }

  private isVideo(filename?: string) {
    if (!filename) return false;
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return ['mp4', 'mkv', 'avi'].includes(ext);
  }

  async listFilesByUid(uid: string) {
    const meta = await this.torrentMetaRepository.getByUid(uid);
    if (!meta) {
      throw new Error('Torrent metadata not found');
    }

    const files: QBFile[] = await this.qBittorrent.getTorrentFiles(meta.hash);

    return files.map((file) => {
      const size = formatBytes(file.size ?? 0);
      let note = '';
      if ((file.size ?? 0) > 2 * 1024 * 1024 * 1024) {
        note = this.isVideo(file.name) ? ' (will be compressed)' : ' (too big to download)';
      }

      const download = (file.size ?? 0) > 2 * 1024 * 1024 * 1024 && !this.isVideo(file.name)
        ? 'N/A'
        : `/dl_file_${uid}_${file.index}`;

      return `${file.index}: ${file.name} — ${size}${note} — ${download}`;
    });
  }
}

export default FileService;
