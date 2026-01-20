import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MyContext } from '../../../Context.js';
import type { FileService } from '../../../domain/services/FileService.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { Logger } from '../../../utils/Logger.js';
import { handleDownloadFileCommand } from '../DownloadHandler.js';

describe('DownloadHandler', () => {
  let mockFileService: Partial<FileService>;
  let mockTorrentService: Partial<TorrentService>;
  let mockLogger: Partial<Logger>;
  let ctx: Partial<MyContext>;

  beforeEach(() => {
    mockFileService = { listFilesByUid: vi.fn() };
    mockTorrentService = { getTorrentByUid: vi.fn(), getTorrentFiles: vi.fn() };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: '/dl_file_uid123_0' },
      reply: vi.fn(),
      t: (k: string) => k,
    };
  });

  it('starts download when file exists and is allowed', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([{ index: 0, name: 'a.mkv', size: 1024 }]);

    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockFileService as unknown as FileService,
      mockTorrentService as unknown as TorrentService,
      mockLogger as unknown as Logger,
    );

    expect((mockTorrentService.getTorrentByUid as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('uid123');
    expect((ctx.reply as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('file-download-started');
  });

  it('replies file-not-found when index missing', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([]);
    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockFileService as unknown as FileService,
      mockTorrentService as unknown as TorrentService,
      mockLogger as unknown as Logger,
    );
    expect((ctx.reply as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('file-not-found');
  });

  it('replies too-big for large non-video files', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([{ index: 0, name: 'file.bin', size: 3 * 1024 * 1024 * 1024 }]);
    await handleDownloadFileCommand(ctx as any, mockFileService as any, mockTorrentService as any, mockLogger as any);
    expect((ctx as any).reply).toHaveBeenCalledWith('file-too-big');
  });

  it('replies error when getTorrentByUid throws', async () => {
    mockTorrentService.getTorrentByUid.mockRejectedValue(new Error('fail'));
    await handleDownloadFileCommand(
      ctx as unknown as MyContext,
      mockFileService as unknown as FileService,
      mockTorrentService as unknown as TorrentService,
      mockLogger as unknown as Logger,
    );
    expect((mockLogger.error as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((ctx.reply as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('file-download-error');
  });
});
