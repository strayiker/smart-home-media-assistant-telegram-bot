import type { QBFile,QBTorrent } from '../../qBittorrent/models.js';
import type { QBittorrentClient } from '../../qBittorrent/QBittorrentClient.js';
import type { SearchEngine, SearchResult } from '../../searchEngines/SearchEngine.js';
import type { Logger } from '../../utils/Logger.js';
import { err, ok, type ResultT } from '../../utils/result.js';
import type { TorrentMetaRepository } from '../../utils/TorrentMetaRepository.js';

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

  async addTorrent(options: AddTorrentOptions): Promise<ResultT<string, Error>> {
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
        error instanceof Error ? error : new Error('Unknown error adding torrent'),
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
      return ok<void>();
    } catch (error) {
      this.logger.error(error, 'An error occurred while deleting torrent');
      return err(
        error instanceof Error ? error : new Error('Unknown error deleting torrent'),
      );
    }
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

  async downloadTorrentFile(seName: string, id: string, searchEngines: SearchEngine[]): Promise<ResultT<string, Error>> {
    const se = searchEngines.find((se) => se.name === seName);

    if (!se) {
      return err(new Error(`Unsupported search engine: ${seName}`));
    }

    try {
      const torrent = await se.downloadTorrentFile(id);
      return ok(torrent);
    } catch (error) {
      this.logger.error(error, 'Failed to download torrent file from: %s', seName);
      return err(
        error instanceof Error ? error : new Error('Failed to download torrent file'),
      );
    }
  }
}
