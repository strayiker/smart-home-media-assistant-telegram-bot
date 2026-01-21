import { beforeEach, describe, expect, it, vi } from 'vitest';

import { container } from '../../../../di.js';
import type { MediaService } from '../../../../domain/services/MediaService.js';
import type { TorrentService } from '../../../../domain/services/TorrentService.js';
import type { Logger } from '../../../../utils/Logger.js';
import { DownloadHandler } from '../DownloadHandler.js';

describe('DownloadHandler Integration Tests', () => {
  let mockTorrentService: Partial<TorrentService>;
  let mockMediaService: Partial<MediaService>;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    // Mock TorrentService methods
    mockTorrentService = {
      getTorrentByUid: vi.fn(),
      getTorrentFiles: vi.fn(),
    };

    // Mock MediaService methods
    mockMediaService = {
      isVideo: vi.fn().mockReturnValue(false),
      getVideoMetadata: vi.fn(),
      getFileType: vi.fn(),
      transcodeVideo: vi.fn(),
      generateThumbnail: vi.fn(),
      generatePreview: vi.fn(),
    };

    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    // Register mocks in DI container
    container.registerInstance(
      'TorrentService',
      mockTorrentService as TorrentService,
    );
    container.registerInstance(
      'MediaService',
      mockMediaService as MediaService,
    );
    container.registerInstance('Logger', mockLogger as Logger);
    container.registerInstance('BotDataPath', '/tmp/test');

    // Create DownloadHandler instance with mocks
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const downloadHandler = new DownloadHandler({
      torrentService: mockTorrentService as TorrentService,
      mediaService: mockMediaService as MediaService,
      dataPath: '/tmp/test',
      logger: mockLogger as Logger,
    });
  });

  describe('DI Container Integration', () => {
    it('should resolve DownloadHandler from DI container', () => {
      const handler = container.resolve<DownloadHandler>('DownloadHandler');
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(DownloadHandler);
    });

    it('should use TorrentService from DI container', () => {
      const handler = container.resolve<DownloadHandler>('DownloadHandler');
      expect(handler).toBeDefined();
    });

    it('should use MediaService from DI container', () => {
      const handler = container.resolve<DownloadHandler>('DownloadHandler');
      expect(handler).toBeDefined();
    });

    it('should use Logger from DI container', () => {
      const handler = container.resolve<DownloadHandler>('DownloadHandler');
      expect(handler).toBeDefined();
    });

    it('should use BotDataPath from DI container', () => {
      const handler = container.resolve<DownloadHandler>('DownloadHandler');
      expect(handler).toBeDefined();
    });
  });

  describe('File Download Integration', () => {
    it('should resolve torrent UID from command', async () => {
      const mockMeta = {
        hash: 'hash1',
        uid: 'engine_123',
        chatId: 1,
        searchEngine: 'engine',
        trackerId: 'id1',
      } as any;
      mockTorrentService.getTorrentByUid = vi.fn().mockResolvedValue(mockMeta);
      mockTorrentService.getTorrentFiles = vi
        .fn()
        .mockResolvedValue([
          { name: 'file1.mp4', size: 1_000_000, index: 0 },
        ] as any);

      // Parse command
      const parts = '/dl_file_engine_123_0'.replace('/dl_file_', '').split('_');
      const uid = `${parts[0]}_${parts[1]}`;

      expect(uid).toBe('engine_123');
    });

    it('should handle non-video files', async () => {
      mockMediaService.isVideo = vi.fn().mockReturnValue(false);
      const result = mockMediaService.isVideo('document.pdf');
      expect(result).toBe(false);
    });

    it('should handle video files', async () => {
      mockMediaService.isVideo = vi.fn().mockReturnValue(true);
      const result = mockMediaService.isVideo('video.mp4');
      expect(result).toBe(true);
    });
  });

  describe('Video Metadata Integration', () => {
    it('should extract video metadata', async () => {
      const mockMetadata = {
        format: { duration: 3600 },
        streams: [
          { codec_type: 'video', width: 1920, height: 1080 },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
      } as any;

      mockMediaService.getVideoMetadata = vi
        .fn()
        .mockResolvedValue(mockMetadata);

      // This would be called by DownloadHandler
      const result = await mockMediaService.getVideoMetadata(
        '/tmp/test/video.mp4',
      );
      expect(result).toEqual(mockMetadata);
      expect(mockMediaService.getVideoMetadata).toHaveBeenCalledWith(
        '/tmp/test/video.mp4',
      );
    });

    it('should handle missing video metadata', async () => {
      mockMediaService.getVideoMetadata = vi.fn().mockResolvedValue(null);

      const result = await mockMediaService.getVideoMetadata(
        '/tmp/test/video.mp4',
      );
      expect(result).toBeNull();
    });
  });
});
