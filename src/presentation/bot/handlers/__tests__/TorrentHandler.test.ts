import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleDownloadCommand, handleRemoveCommand } from '../TorrentHandler.js';

describe('TorrentHandler', () => {
  let mockTorrentService: any;
  let mockLogger: any;
  let ctx: any;

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
    };
  });

  it('downloads and adds torrent successfully', async () => {
    mockTorrentService.downloadTorrentFile.mockResolvedValue({ ok: true, value: 'torrentdata' });
    mockTorrentService.addTorrent.mockResolvedValue({ ok: true, value: 'hash' });

    await handleDownloadCommand(ctx, mockTorrentService, [{ name: 'engine' }], mockLogger);

    expect(mockTorrentService.downloadTorrentFile).toHaveBeenCalled();
    expect(mockTorrentService.addTorrent).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('torrent-download-success');
  });

  it('replies error when download fails', async () => {
    mockTorrentService.downloadTorrentFile.mockResolvedValue({ ok: false, error: new Error('fail') });
    await handleDownloadCommand(ctx, mockTorrentService, [{ name: 'engine' }], mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('torrent-download-error');
  });

  it('removes torrent and replies success', async () => {
    ctx.message.text = '/rm_engine_123';
    mockTorrentService.removeTorrentByUid.mockResolvedValue('hash');
    await handleRemoveCommand(ctx, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('torrents-removed-success');
  });

  it('replies error when remove fails', async () => {
    ctx.message.text = '/rm_engine_123';
    mockTorrentService.removeTorrentByUid.mockRejectedValue(new Error('fail'));
    await handleRemoveCommand(ctx, mockTorrentService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('torrent-remove-error');
  });
});
