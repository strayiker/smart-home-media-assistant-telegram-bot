import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyContext } from '../../../Context.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { MediaService } from '../../../domain/services/MediaService.js';
import type { Logger } from '../../../utils/Logger.js';
import { handleDownloadFileCommand } from '../DownloadHandler.js';

describe('DownloadHandler', () => {
  let mockMediaService: Partial<MediaService>;
  let mockTorrentService: Partial<TorrentService>;
  let mockLogger: Partial<Logger>;
  let ctx: Partial<MyContext>;

  beforeEach(() => {
    mockMediaService = {
      isVideo: vi.fn(),
      getVideoMetadata: vi.fn(),
      getFileType: vi.fn(),
    };
    mockTorrentService = {
      getTorrentByUid: vi.fn(),
      getTorrentFiles: vi.fn(),
    };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: '/dl_file_engine_123_0' },
      reply: vi.fn(),
      t: (k: string) => k,
      chatId: 1,
    };
  });

  it('starts download when file exists and is allowed', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([
      { index: 0, name: 'a.mkv', size: 1024 },
    ]);
    mockMediaService.isVideo.mockReturnValue(true);
    mockMediaService.getFileType.mockResolvedValue({ mime: 'video/mp4' });
    mockMediaService.getVideoMetadata.mockResolvedValue({
      format: { duration: 3600 },
      streams: [
        { codec_type: 'video', width: 1920, height: 1080 },
      ],
    });

    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockTorrentService as unknown as any,
      mockMediaService as unknown as any,
      '/tmp/test',
      mockLogger as unknown as Logger,
    );

    expect(
      mockTorrentService.getTorrentByUid as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith('engine_123');
    expect(ctx.reply as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'torrent-file-uploading',
    );
  });

  it('replies torrent-file-empty when index missing', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([]);
    mockMediaService.getFileType.mockResolvedValue({ mime: 'video/mp4' });

    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockTorrentService as unknown as any,
      mockMediaService as unknown as any,
      '/tmp/test',
      mockLogger as unknown as Logger,
    );
    expect(ctx.reply as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'torrent-file-empty',
    );
  });

  it('replies torrent-file-too-big for large non-video files', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([
      { index: 0, name: 'file.bin', size: 3 * 1024 * 1024 * 1024 },
    ]);
    mockMediaService.isVideo.mockReturnValue(false);
    mockMediaService.getFileType.mockResolvedValue({ mime: 'application/octet-stream' });

    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockTorrentService as unknown as any,
      mockMediaService as unknown as any,
      '/tmp/test',
      mockLogger as unknown as Logger,
    );
    expect((ctx as any).reply).toHaveBeenCalledWith('torrent-file-too-big');
  });

  it('replies torrent-file-error when getTorrentByUid throws', async () => {
    mockTorrentService.getTorrentByUid.mockRejectedValue(new Error('fail'));

    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockTorrentService as unknown as any,
      mockMediaService as unknown as any,
      '/tmp/test',
      mockLogger as unknown as Logger,
    );

    expect(mockLogger.error as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(ctx.reply as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'torrent-file-error',
    );
  });
});
