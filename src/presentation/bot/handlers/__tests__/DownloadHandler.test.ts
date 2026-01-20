import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleDownloadFileCommand } from '../DownloadHandler.js';

describe('DownloadHandler', () => {
  let mockFileService: any;
  let mockTorrentService: any;
  let mockLogger: any;
  let ctx: any;

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

    await handleDownloadFileCommand(ctx, mockFileService, mockTorrentService, mockLogger);

    expect(mockTorrentService.getTorrentByUid).toHaveBeenCalledWith('uid123');
    expect(ctx.reply).toHaveBeenCalledWith('file-download-started');
  });

  it('replies file-not-found when index missing', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([]);
    await handleDownloadFileCommand(ctx, mockFileService, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('file-not-found');
  });

  it('replies too-big for large non-video files', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([{ index: 0, name: 'file.bin', size: 3 * 1024 * 1024 * 1024 }]);
    await handleDownloadFileCommand(ctx, mockFileService, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('file-too-big');
  });

  it('replies error when getTorrentByUid throws', async () => {
    mockTorrentService.getTorrentByUid.mockRejectedValue(new Error('fail'));
    await handleDownloadFileCommand(ctx, mockFileService, mockTorrentService, mockLogger);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('file-download-error');
  });
});
