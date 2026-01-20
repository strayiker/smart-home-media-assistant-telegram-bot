import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleDownloadCommand, handleRemoveCommand } from '../TorrentHandler.js';

describe('TorrentHandler', () => {
  let mockTorrentService: unknown;
  let mockLogger: unknown;
  let ctx: unknown;

  beforeEach(() => {
    mockTorrentService = {
      downloadTorrentFile: vi.fn(),
      addTorrent: vi.fn(),
      removeTorrentByUid: vi.fn(),
    };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: '/dl_engine_123' },
      reply: vi.fn(),
      t: (k: string) => k,
      chatId: 42,
    } as unknown;
  });

  it('downloads and adds torrent successfully', async () => {
    mockTorrentService.downloadTorrentFile.mockResolvedValue({ ok: true, value: 'torrentdata' });
    mockTorrentService.addTorrent.mockResolvedValue({ ok: true, value: 'hash' });

    await handleDownloadCommand(ctx as any, mockTorrentService as any, [{ name: 'engine' }], mockLogger as any);

    expect(mockTorrentService.downloadTorrentFile).toHaveBeenCalled();
    expect(mockTorrentService.addTorrent).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('torrent-download-success');
  });

  it('replies error when download fails', async () => {
    mockTorrentService.downloadTorrentFile.mockResolvedValue({ ok: false, error: new Error('fail') });
    await handleDownloadCommand(ctx as any, mockTorrentService as any, [{ name: 'engine' }], mockLogger as any);
    expect(ctx.reply).toHaveBeenCalledWith('torrent-download-error');
  });

  it('removes torrent and replies success', async () => {
    ctx.message.text = '/rm_engine_123';
    mockTorrentService.removeTorrentByUid.mockResolvedValue('hash');
    await handleRemoveCommand(ctx as any, mockTorrentService as any, mockLogger as any);
    expect(ctx.reply).toHaveBeenCalledWith('torrents-removed-success');
  });

  it('replies error when remove fails', async () => {
    ctx.message.text = '/rm_engine_123';
    mockTorrentService.removeTorrentByUid.mockRejectedValue(new Error('fail'));
    await handleRemoveCommand(ctx as any, mockTorrentService as any, mockLogger as any);
    expect(ctx.reply).toHaveBeenCalledWith('torrent-remove-error');
  });
});
