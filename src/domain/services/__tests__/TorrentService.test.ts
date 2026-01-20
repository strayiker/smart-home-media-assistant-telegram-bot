import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../utils/result.js';
import type { TorrentMeta } from '../../entities/TorrentMeta.js';
import type { QBFile as _QBFile, QBTorrent } from '../../qBittorrent/models.js';
import type { QBittorrentClient } from '../../qBittorrent/QBittorrentClient.js';
import type {
  SearchEngine,
  SearchResult,
} from '../../searchEngines/SearchEngine.js';
import type { Logger } from '../../utils/Logger.js';
import type { TorrentMetaRepository } from '../../utils/TorrentMetaRepository.js';
import { TorrentService } from '../TorrentService.js';

describe('TorrentService', () => {
  let service: TorrentService;
  let mockQBittorrentClient: QBittorrentClient;
  let mockTorrentMetaRepository: TorrentMetaRepository;
  let mockLogger: Logger;
  let mockSearchEngine: SearchEngine;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    // Mock QBittorrentClient
    mockQBittorrentClient = {
      addTorrents: vi.fn(),
      getTorrents: vi.fn(),
      getTorrentFiles: vi.fn(),
      deleteTorrents: vi.fn(),
    } as unknown as QBittorrentClient;

    // Mock TorrentMetaRepository
    mockTorrentMetaRepository = {
      create: vi.fn(),
      getByUid: vi.fn(),
      getByHash: vi.fn(),
      getByHashes: vi.fn(),
      getByChatId: vi.fn(),
      removeByHash: vi.fn(),
      removeByUid: vi.fn(),
    } as unknown as TorrentMetaRepository;

    // Mock SearchEngine
    mockSearchEngine = {
      name: 'test-engine',
      search: vi.fn(),
      downloadTorrentFile: vi.fn(),
    } as unknown as SearchEngine;

    service = new TorrentService(
      mockQBittorrentClient,
      mockTorrentMetaRepository,
      mockLogger,
    );
  });

  describe('addTorrent', () => {
    it('should successfully add a torrent and save metadata', async () => {
      const torrentData = 'base64encodedtorrentdata';
      const uid = 'test-engine_12345';
      const hash = 'abc123hash';

      vi.mocked(mockQBittorrentClient.addTorrents).mockResolvedValue(
        ok([hash]),
      );
      vi.mocked(mockTorrentMetaRepository.create).mockResolvedValue(
        {} as TorrentMeta,
      );

      const result = await service.addTorrent({
        torrent: torrentData,
        uid,
        chatId: 12_345,
        searchEngine: 'test-engine',
        trackerId: '12345',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(hash);
      }

      expect(mockQBittorrentClient.addTorrents).toHaveBeenCalledWith({
        torrents: [torrentData],
      });
      expect(mockTorrentMetaRepository.create).toHaveBeenCalledWith({
        hash,
        uid,
        chatId: 12_345,
        searchEngine: 'test-engine',
        trackerId: '12345',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'A new torrent was successfully added: %s',
        hash,
      );
    });

    it('should rollback and return error if QBittorrentClient fails', async () => {
      const error = new Error('qBittorrent connection failed');
      vi.mocked(mockQBittorrentClient.addTorrents).mockResolvedValue(
        err(error),
      );

      const result = await service.addTorrent({
        torrent: 'data',
        uid: 'uid',
        chatId: 123,
        searchEngine: 'se',
        trackerId: 'id',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(error);
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should rollback torrent creation if metadata persistence fails', async () => {
      const hash = 'abc123';
      const createError = new Error('Database write failed');

      vi.mocked(mockQBittorrentClient.addTorrents).mockResolvedValue(
        ok([hash]),
      );
      vi.mocked(mockTorrentMetaRepository.create).mockRejectedValue(
        createError,
      );
      vi.mocked(mockQBittorrentClient.deleteTorrents).mockResolvedValue();

      const result = await service.addTorrent({
        torrent: 'data',
        uid: 'uid',
        chatId: 123,
        searchEngine: 'se',
        trackerId: 'id',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(createError);
      }

      expect(mockQBittorrentClient.deleteTorrents).toHaveBeenCalledWith(
        [hash],
        true,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        createError,
        'Failed to persist torrent metadata',
      );
    });
  });

  describe('getTorrents', () => {
    it('should fetch torrents by hashes', async () => {
      const hashes = ['hash1', 'hash2'];
      const torrents: QBTorrent[] = [
        { hash: 'hash1', name: 'Torrent 1' } as QBTorrent,
        { hash: 'hash2', name: 'Torrent 2' } as QBTorrent,
      ];

      vi.mocked(mockQBittorrentClient.getTorrents).mockResolvedValue(torrents);

      const result = await service.getTorrents(hashes);

      expect(result).toEqual(torrents);
      expect(mockQBittorrentClient.getTorrents).toHaveBeenCalledWith({
        hashes,
      });
    });

    it('should throw error if fetch fails', async () => {
      const error = new Error('Fetch failed');
      vi.mocked(mockQBittorrentClient.getTorrents).mockRejectedValue(error);

      await expect(service.getTorrents(['hash1'])).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('deleteTorrent', () => {
    it('should successfully delete torrent and metadata', async () => {
      vi.mocked(mockQBittorrentClient.deleteTorrents).mockResolvedValue();
      vi.mocked(mockTorrentMetaRepository.removeByHash).mockResolvedValue();

      const result = await service.deleteTorrent('hash1');

      expect(result.ok).toBe(true);
      expect(mockQBittorrentClient.deleteTorrents).toHaveBeenCalledWith(
        ['hash1'],
        true,
      );
      expect(mockTorrentMetaRepository.removeByHash).toHaveBeenCalledWith(
        'hash1',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'A torrent was successfully deleted: %s',
        'hash1',
      );
    });

    it('should return error if deletion fails', async () => {
      const error = new Error('Deletion failed');
      vi.mocked(mockQBittorrentClient.deleteTorrents).mockRejectedValue(error);

      const result = await service.deleteTorrent('hash1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual(error);
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('searchTorrents', () => {
    it('should aggregate results from multiple search engines', async () => {
      const searchResults: SearchResult[] = [
        {
          id: 'id1',
          title: 'Test Torrent',
          tags: [],
          size: 1024,
          seeds: 10,
          peers: 5,
          downloadUrl: 'https://example.com/download',
        },
      ];

      vi.mocked(mockSearchEngine.search).mockResolvedValue(searchResults);

      const results = await service.searchTorrents('query', [mockSearchEngine]);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual([mockSearchEngine, searchResults]);
    });

    it('should handle search engine failures gracefully', async () => {
      vi.mocked(mockSearchEngine.search).mockRejectedValue(
        new Error('Search failed'),
      );

      const results = await service.searchTorrents('query', [mockSearchEngine]);

      expect(results).toHaveLength(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('downloadTorrentFile', () => {
    it('should download torrent file from supported engine', async () => {
      const torrentData = 'base64torrentdata';
      vi.mocked(mockSearchEngine.downloadTorrentFile).mockResolvedValue(
        torrentData,
      );

      const result = await service.downloadTorrentFile('test-engine', 'id', [
        mockSearchEngine,
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(torrentData);
      }
    });

    it('should return error for unsupported engine', async () => {
      const result = await service.downloadTorrentFile('unsupported', 'id', [
        mockSearchEngine,
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Unsupported search engine');
      }
    });
  });
});
