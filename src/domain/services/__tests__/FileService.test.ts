import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileService } from '../FileService.js';

describe('FileService', () => {
  let service: FileService;
  let mockQBittorrent: any;
  let mockTorrentMetaRepository: any;
  let mockLogger: any;

  beforeEach(() => {
    mockQBittorrent = {
      getTorrentFiles: vi.fn(),
    };

    mockTorrentMetaRepository = {
      getByUid: vi.fn(),
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new FileService({
      qBittorrent: mockQBittorrent,
      torrentMetaRepository: mockTorrentMetaRepository,
      dataPath: '/tmp',
      logger: mockLogger,
    });
  });

  it('lists files for a given uid', async () => {
    mockTorrentMetaRepository.getByUid.mockResolvedValue({ hash: 'hash1' });

    mockQBittorrent.getTorrentFiles.mockResolvedValue([
      { index: 0, name: 'video.mp4', size: 5 * 1024 * 1024 },
      { index: 1, name: 'big.bin', size: 5 * 1024 * 1024 * 1024 },
    ]);

    const result = await service.listFilesByUid('engine_1');

    expect(result).toHaveLength(2);
    expect(result[0]).toContain('video.mp4');
    expect(result[0]).toContain('/dl_file_engine_1_0');
    expect(result[1]).toContain('big.bin');
    // big.bin is non-video and too big -> download N/A
    expect(result[1]).toContain('N/A');
  });

  it('throws when metadata not found', async () => {
    mockTorrentMetaRepository.getByUid.mockResolvedValue(null);
    await expect(service.listFilesByUid('nonexistent')).rejects.toThrow(
      'Torrent metadata not found',
    );
  });
});
