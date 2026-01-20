import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handlePreviewCommand,
  handleThumbnailCommand,
} from '../MediaHandler.js';

describe('MediaHandler', () => {
  let mockTorrentService: unknown;
  let mockLogger: unknown;
  let ctx: unknown;

  beforeEach(() => {
    mockTorrentService = { getTorrentByUid: vi.fn(), getTorrentFiles: vi.fn() };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: '/preview_uid123_0' },
      reply: vi.fn(),
      t: (k: string) => k,
    } as unknown;
  });

  it('starts preview when file exists', async () => {
    (mockTorrentService as any).getTorrentByUid.mockResolvedValue({
      hash: 'h',
    });
    (mockTorrentService as any).getTorrentFiles.mockResolvedValue([
      { index: 0, name: 'a.mkv', size: 1024 },
    ]);
    await handlePreviewCommand(
      ctx as any,
      mockTorrentService as any,
      mockLogger as any,
    );
    expect((ctx as any).reply).toHaveBeenCalledWith('preview-started');
  });

  it('starts thumbnail when file exists', async () => {
    (ctx as any).message.text = '/thumb_uid123_0';
    (mockTorrentService as any).getTorrentByUid.mockResolvedValue({
      hash: 'h',
    });
    (mockTorrentService as any).getTorrentFiles.mockResolvedValue([
      { index: 0, name: 'a.mkv', size: 1024 },
    ]);
    await handleThumbnailCommand(
      ctx as any,
      mockTorrentService as any,
      mockLogger as any,
    );
    expect((ctx as any).reply).toHaveBeenCalledWith('thumb-started');
  });

  it('replies file-not-found when missing', async () => {
    (mockTorrentService as any).getTorrentByUid.mockResolvedValue({
      hash: 'h',
    });
    (mockTorrentService as any).getTorrentFiles.mockResolvedValue([]);
    await handlePreviewCommand(
      ctx as any,
      mockTorrentService as any,
      mockLogger as any,
    );
    expect((ctx as any).reply).toHaveBeenCalledWith('file-not-found');
  });

  it('replies error when service throws', async () => {
    (mockTorrentService as any).getTorrentByUid.mockRejectedValue(
      new Error('fail'),
    );
    await handlePreviewCommand(
      ctx as any,
      mockTorrentService as any,
      mockLogger as any,
    );
    expect((mockLogger as any).error).toHaveBeenCalled();
    expect((ctx as any).reply).toHaveBeenCalledWith('preview-error');
  });
});
