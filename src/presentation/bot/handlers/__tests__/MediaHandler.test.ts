import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handlePreviewCommand, handleThumbnailCommand } from '../MediaHandler.js';

describe('MediaHandler', () => {
  let mockTorrentService: any;
  let mockLogger: any;
  let ctx: any;

  beforeEach(() => {
    mockTorrentService = { getTorrentByUid: vi.fn(), getTorrentFiles: vi.fn() };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: '/preview_uid123_0' },
      reply: vi.fn(),
      t: (k: string) => k,
    };
  });

  it('starts preview when file exists', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([{ index: 0, name: 'a.mkv', size: 1024 }]);
    await handlePreviewCommand(ctx, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('preview-started');
  });

  it('starts thumbnail when file exists', async () => {
    ctx.message.text = '/thumb_uid123_0';
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([{ index: 0, name: 'a.mkv', size: 1024 }]);
    await handleThumbnailCommand(ctx, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('thumb-started');
  });

  it('replies file-not-found when missing', async () => {
    mockTorrentService.getTorrentByUid.mockResolvedValue({ hash: 'h' });
    mockTorrentService.getTorrentFiles.mockResolvedValue([]);
    await handlePreviewCommand(ctx, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('file-not-found');
  });

  it('replies error when service throws', async () => {
    mockTorrentService.getTorrentByUid.mockRejectedValue(new Error('fail'));
    await handlePreviewCommand(ctx, mockTorrentService, mockLogger);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('preview-error');
  });
});
