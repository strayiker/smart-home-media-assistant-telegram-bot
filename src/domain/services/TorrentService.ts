import type { MyContext } from '../../shared/context.js';
import type { QBFile, QBTorrent } from '../../infrastructure/qbittorrent/qbittorrent/models.js';
import type { QBittorrentClient } from '../../infrastructure/qbittorrent/qbittorrent/qBittorrentClient.js';
import type {
  SearchEngine,
  SearchResult,
} from '../../infrastructure/searchEngines/searchEngines/searchEngine.js';
import type { Logger } from '../../shared/utils/logger.js';
import { err, ok, type ResultT } from '../../shared/utils/result.js';
import type { TorrentMetaRepository } from '../../infrastructure/persistence/repositories/TorrentMetaRepository.js';

export interface AddTorrentOptions {
  torrent: string;
  uid: string;
  chatId: number;
  searchEngine: string;
  trackerId: string;
}

export class TorrentService {
  constructor(
    private readonly qbittorrent: QBittorrentClient,
    private readonly torrentMetaRepository: TorrentMetaRepository,
    private readonly logger: Logger,
  ) {}

  async addTorrent(
    options: AddTorrentOptions,
  ): Promise<ResultT<string, Error>> {
    const { torrent, uid, chatId, searchEngine, trackerId } = options;

    try {
      const result = await this.qbittorrent.addTorrents({
        torrents: [torrent],
      });

      if (!result.ok) {
        const error =
          result.error instanceof Error
            ? result.error
            : new Error('Failed to add torrent');
        this.logger.error(error, 'Failed to add torrent via qBittorrent');
        return err(error);
      }

      const [hash] = result.value;

      try {
        await this.torrentMetaRepository.create({
          hash,
          uid,
          chatId,
          searchEngine,
          trackerId,
        });
      } catch (createError) {
        this.logger.error(createError, 'Failed to persist torrent metadata');

        // Rollback: remove the torrent from qBittorrent
        try {
          await this.qbittorrent.deleteTorrents([hash], true);
        } catch (deleteError) {
          this.logger.error(deleteError, 'Failed to rollback torrent creation');
        }

        return err(
          createError instanceof Error
            ? createError
            : new Error('Failed to persist torrent metadata'),
        );
      }

      this.logger.debug('A new torrent was successfully added: %s', hash);
      return ok(hash);
    } catch (error) {
      this.logger.error(error, 'An error occurred while adding new torrent');
      return err(
        error instanceof Error
          ? error
          : new Error('Unknown error adding torrent'),
      );
    }
  }

  async getTorrents(hashes: string[]): Promise<QBTorrent[]> {
    try {
      return await this.qbittorrent.getTorrents({ hashes });
    } catch (error) {
      this.logger.error(error, 'An error occurred while fetching torrents');
      throw error;
    }
  }

  async getTorrentsByHash(hashes: string[]): Promise<QBTorrent[]> {
    try {
      const torrentMap = new Map<string, QBTorrent>();
      const torrents = await this.qbittorrent.getTorrents({ hashes });
      for (const torrent of torrents) {
        torrentMap.set(torrent.hash, torrent);
      }
      return hashes
        .map((hash) => torrentMap.get(hash) as QBTorrent | undefined)
        .filter((t): t is QBTorrent => t !== undefined);
    } catch (error) {
      this.logger.error(error, 'An error occurred while fetching torrents');
      throw error;
    }
  }

  async getTorrentListPage(
    chatId: number,
    page: number = 1,
    itemsPerPage: number = 5,
  ): Promise<{
    torrents: QBTorrent[];
    totalPages: number;
    pageItems: QBTorrent[];
  }> {
    try {
      const metas = await this.torrentMetaRepository.getByChatId(chatId);
      if (metas.length === 0) {
        return { torrents: [], totalPages: 1, pageItems: [] };
      }

      const totalPages = Math.max(1, Math.ceil(metas.length / itemsPerPage));
      const safePage = Math.min(Math.max(page, 1), totalPages);
      const offset = (safePage - 1) * itemsPerPage;

      const pageMetas = metas.slice(offset, offset + itemsPerPage);
      const hashes = pageMetas.map((meta) => meta.hash);
      const torrents = await this.qbittorrent.getTorrents({ hashes });
      const torrentMap = new Map<string, QBTorrent>(torrents.map((t: QBTorrent) => [t.hash, t]));

      const pageItems: QBTorrent[] = pageMetas
        .map((meta) => torrentMap.get(meta.hash)!)
        .filter((t): t is QBTorrent => t !== undefined);

      return { torrents: pageItems, totalPages, pageItems };
    } catch (error) {
      this.logger.error(
        error,
        'An error occurred while fetching torrent list page',
      );
      throw error;
    }
  }

  async getTorrentByUid(uid: string) {
    try {
      const meta = await this.torrentMetaRepository.getByUid(uid);
      if (!meta) {
        throw new Error(`Torrent metadata not found for uid: ${uid}`);
      }
      return meta;
    } catch (error) {
      this.logger.error(
        error,
        'An error occurred while fetching torrent metadata',
      );
      throw error;
    }
  }

  async getTorrentFiles(hash: string, indexes?: number[]): Promise<QBFile[]> {
    try {
      return await this.qbittorrent.getTorrentFiles(hash, indexes);
    } catch (error) {
      this.logger.error(
        error,
        'An error occurred while retrieving torrent files',
      );
      throw error;
    }
  }

  async deleteTorrent(hash: string): Promise<ResultT<void, Error>> {
    try {
      await this.qbittorrent.deleteTorrents([hash], true);
      await this.torrentMetaRepository.removeByHash(hash);

      this.logger.debug('A torrent was successfully deleted: %s', hash);
      return ok(undefined as void);
    } catch (error) {
      this.logger.error(error, 'An error occurred while deleting torrent');
      return err(
        error instanceof Error
          ? error
          : new Error('Unknown error deleting torrent'),
      );
    }
  }

  async getTorrentMetasByChatId(chatId: number) {
    return await this.torrentMetaRepository.getByChatId(chatId);
  }

  async getTorrentFilesByUid(uid: string): Promise<QBFile[]> {
    const meta = await this.getTorrentByUid(uid);
    return await this.qbittorrent.getTorrentFiles(meta.hash);
  }

  /**
   * Format duration in human-readable format.
   * Converts seconds to "Xh Ym" or "Ym" format.
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Format bytes in human-readable format (KB, MB, GB).
   */
  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const size = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, size);
    return `${value.toFixed(1)} ${units[size]}`;
  }

  /**
   * Format a torrent file item for display in the file list.
   */
  formatTorrentFileItem(ctx: MyContext, uid: string, file: QBFile): string {
    const dlCmd = `/dl_file_${uid}_${file.index}`;
    const fileName = `<a href="${dlCmd}">${file.name}</a>`;
    const fileSize = this.formatBytes(file.size);

    return ctx.t('torrent-file-item', {
      fileName,
      fileSize,
    });
  }

  async searchTorrents(
    query: string,
    searchEngines: SearchEngine[],
  ): Promise<(readonly [SearchEngine, SearchResult[]])[]> {
    const results: (readonly [SearchEngine, SearchResult[]])[] = [];

    const promises = searchEngines.map(async (searchEngine) => {
      try {
        const result = await searchEngine.search(query);
        return [searchEngine, result] as const;
      } catch (error) {
        this.logger.error(
          error,
          'An error occurred while searching with engine: %s',
          searchEngine.name,
        );
        return;
      }
    });

    const awaited = await Promise.all(promises);

    for (const result of awaited) {
      if (result !== undefined) {
        results.push(result);
      }
    }

    return results;
  }

  async removeTorrentByUid(uid: string): Promise<string> {
    const meta = await this.getTorrentByUid(uid);
    const result = await this.deleteTorrent(meta.hash);

    if (!result.ok) {
      throw result.error;
    }

    return meta.hash;
  }

  async downloadTorrentFile(
    seName: string,
    id: string,
    searchEngines: SearchEngine[],
  ): Promise<ResultT<string, Error>> {
    const se = searchEngines.find((se) => se.name === seName);

    if (!se) {
      return err(new Error(`Unsupported search engine: ${seName}`));
    }

    try {
      const torrent = await se.downloadTorrentFile(id);
      return ok(torrent);
    } catch (error) {
      this.logger.error(
        error,
        'Failed to download torrent file from: %s',
        seName,
      );
      return err(
        error instanceof Error
          ? error
          : new Error('Failed to download torrent file'),
      );
    }
  }
}
