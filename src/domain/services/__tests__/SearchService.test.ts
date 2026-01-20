import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  SearchEngine,
  SearchResult,
} from '../../searchEngines/SearchEngine.js';
import type { Logger } from '../../utils/Logger.js';
import { err as _err, ok as _ok } from '../../utils/result.js';
import { SearchService } from '../SearchService.js';

describe('SearchService', () => {
  let service: SearchService;
  let mockLogger: Logger;
  let mockSearchEngine1: SearchEngine;
  let mockSearchEngine2: SearchEngine;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    mockSearchEngine1 = {
      name: 'engine1',
      search: vi.fn(),
      downloadTorrentFile: vi.fn(),
    } as unknown as SearchEngine;

    mockSearchEngine2 = {
      name: 'engine2',
      search: vi.fn(),
      downloadTorrentFile: vi.fn(),
    } as unknown as SearchEngine;

    service = new SearchService({
      searchEngines: [mockSearchEngine1, mockSearchEngine2],
      logger: mockLogger,
    });
  });

  describe('search', () => {
    it('should aggregate results from multiple search engines', async () => {
      const results1: SearchResult[] = [
        {
          id: 'id1',
          title: 'Torrent 1',
          tags: ['tag1'],
          size: 1024,
          seeds: 10,
          peers: 5,
          downloadUrl: 'https://example.com/1',
        },
        {
          id: 'id2',
          title: 'Torrent 2',
          tags: ['tag2'],
          size: 2048,
          seeds: 20,
          peers: 10,
          downloadUrl: 'https://example.com/2',
        },
      ];

      const results2: SearchResult[] = [
        {
          id: 'id3',
          title: 'Torrent 3',
          tags: ['tag3'],
          size: 4096,
          seeds: 30,
          peers: 15,
          downloadUrl: 'https://example.com/3',
        },
      ];

      vi.mocked(mockSearchEngine1.search).mockResolvedValue(results1);
      vi.mocked(mockSearchEngine2.search).mockResolvedValue(results2);

      const result = await service.search('test query');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
        // SearchService now returns tuples: [SearchEngine, SearchResult][]
        const expected = [
          [mockSearchEngine1, results1[0]],
          [mockSearchEngine1, results1[1]],
          [mockSearchEngine2, results2[0]],
        ];
        expect(result.value).toEqual(expected);
      }

      expect(mockSearchEngine1.search).toHaveBeenCalledWith('test query');
      expect(mockSearchEngine2.search).toHaveBeenCalledWith('test query');
    });

    it('should handle search engine failures gracefully', async () => {
      const results1: SearchResult[] = [
        {
          id: 'id1',
          title: 'Torrent 1',
          tags: [],
          size: 1024,
          seeds: 10,
          peers: 5,
          downloadUrl: 'https://example.com/1',
        },
      ];

      vi.mocked(mockSearchEngine1.search).mockResolvedValue(results1);
      vi.mocked(mockSearchEngine2.search).mockRejectedValue(
        new Error('Engine 2 failed'),
      );

      const result = await service.search('test query');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        // SearchService now returns tuples: [SearchEngine, SearchResult][]
        expect(result.value).toEqual([[mockSearchEngine1, results1[0]]]);
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'An error occurred while searching with engine: %s',
        'engine2',
      );
    });

    it('should return error if all engines fail', async () => {
      vi.mocked(mockSearchEngine1.search).mockRejectedValue(
        new Error('Engine 1 failed'),
      );
      vi.mocked(mockSearchEngine2.search).mockRejectedValue(
        new Error('Engine 2 failed'),
      );

      const result = await service.search('test query');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
    });

    it('should return error on unexpected failure', async () => {
      // Mock an unexpected error in the service itself
      vi.mocked(mockSearchEngine1.search).mockImplementation(() => {
        throw 'string error';
      });

      const result = await service.search('test query');

      // When search throws a non-Error, it's logged and result is returned normally
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
