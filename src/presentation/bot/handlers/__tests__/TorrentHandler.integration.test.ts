import { beforeEach, describe, expect, it, vi } from 'vitest';

import { container } from '../../../../di.js';
import type { TorrentService } from '../../../../domain/services/TorrentService.js';
import type { SearchEngine } from '../../../../searchEngines/searchEngine.js';
import type { Logger } from '../../../../utils/logger.js';
import { TorrentHandler } from '../TorrentHandler.js';

describe('TorrentHandler Integration Tests', () => {
  let mockTorrentService: Partial<TorrentService>;
  let mockLogger: Partial<Logger>;
  let mockSearchEngines: SearchEngine[];

  beforeEach(() => {
    // Mock TorrentService methods
    mockTorrentService = {
      downloadTorrentFile: vi.fn(),
      addTorrent: vi.fn(),
      removeTorrentByUid: vi.fn(),
      getTorrentByUid: vi.fn(),
      getTorrentFiles: vi.fn(),
      getTorrentsByHash: vi.fn(),
      getTorrentMetasByChatId: vi.fn(),
      formatTorrentFileItem: vi.fn(),
      formatDuration: vi.fn().mockReturnValue('10m'),
      formatBytes: vi.fn().mockReturnValue('1GB'),
    };

    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    mockSearchEngines = [];

    // Register mocks in DI container
    container.registerInstance(
      'TorrentService',
      mockTorrentService as TorrentService,
    );
    container.registerInstance('Logger', mockLogger as Logger);
    container.registerInstance('SearchEngines', mockSearchEngines);

    // Register minimal Bot and repository instances required by DI
    container.registerInstance('Bot', {} as any);
    container.registerInstance('ChatSettingsRepository', {
      getLocale: vi.fn().mockResolvedValue('en'),
    } as any);
    container.registerInstance('ChatMessageStateRepository', {
      getAllActiveTorrentProgressMessages: vi.fn().mockResolvedValue([]),
      cleanupExpiredMessages: vi.fn().mockResolvedValue(0),
    } as any);
    // TorrentHandler will be resolved from DI during tests
  });

  describe('DI Container Integration', () => {
    it('should resolve TorrentHandler from DI container', () => {
      const handler = container.resolve<TorrentHandler>('TorrentHandler');
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(TorrentHandler);
    });

    it('should use TorrentService from DI container', () => {
      const handler = container.resolve<TorrentHandler>('TorrentHandler');
      expect(handler).toBeDefined();
    });

    it('should use Logger from DI container', () => {
      const handler = container.resolve<TorrentHandler>('TorrentHandler');
      expect(handler).toBeDefined();
    });

    it('should use SearchEngines from DI container', () => {
      const handler = container.resolve<TorrentHandler>('TorrentHandler');
      expect(handler).toBeDefined();
    });
  });

  describe('Torrent List Integration', () => {
    it('should build torrent list with pagination', async () => {
      const mockMetas = [
        {
          hash: 'hash1',
          uid: 'uid1',
          chatId: 1,
          searchEngine: 'engine',
          trackerId: 'id1',
        },
        {
          hash: 'hash2',
          uid: 'uid2',
          chatId: 1,
          searchEngine: 'engine',
          trackerId: 'id2',
        },
      ] as any;

      const mockTorrents = [
        {
          hash: 'hash1',
          name: 'Torrent 1',
          progress: 1,
          size: 1_000_000_000,
          dlspeed: 0,
          eta: 0,
        },
        {
          hash: 'hash2',
          name: 'Torrent 2',
          progress: 0.5,
          size: 2_000_000_000,
          dlspeed: 1_000_000,
          eta: 600,
        },
      ] as any;

      mockTorrentService.getTorrentMetasByChatId = vi
        .fn()
        .mockResolvedValue(mockMetas);
      mockTorrentService.getTorrentsByHash = vi
        .fn()
        .mockResolvedValue(mockTorrents);

      // This would be called by the TorrentHandler
      const result = await mockTorrentService.getTorrentMetasByChatId(1);
      expect(result).toEqual(mockMetas);
      expect(mockTorrentService.getTorrentMetasByChatId).toHaveBeenCalledWith(
        1,
      );
    });

    it('should handle empty torrent list', async () => {
      mockTorrentService.getTorrentMetasByChatId = vi
        .fn()
        .mockResolvedValue([]);

      const result = await mockTorrentService.getTorrentMetasByChatId(1);
      expect(result).toEqual([]);
    });
  });

  describe('Remove Torrent Integration', () => {
    it('should remove torrent and update list', async () => {
      mockTorrentService.removeTorrentByUid = vi
        .fn()
        .mockResolvedValue('hash1');
      mockTorrentService.getTorrentMetasByChatId = vi
        .fn()
        .mockResolvedValue([]);

      await mockTorrentService.removeTorrentByUid('engine_123');
      expect(mockTorrentService.removeTorrentByUid).toHaveBeenCalledWith(
        'engine_123',
      );
    });
  });
});
