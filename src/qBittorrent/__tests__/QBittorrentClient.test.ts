import parseTorrent from 'parse-torrent';
import { describe, expect, it, type Mock,vi } from 'vitest';

import { isErr, isOk, unsafeUnwrap } from '../../utils/result.js';
import { QBittorrentClient } from '../QBittorrentClient.js';

vi.mock('parse-torrent', () => ({ __esModule: true, default: vi.fn() }));

describe('QBittorrentClient.addTorrentsSafe', () => {
  it('returns ok with hashes when parse and request succeed', async () => {
    const mockedParse = parseTorrent as unknown as Mock;
    mockedParse.mockResolvedValue({ infoHash: 'abc123' });

    const client = new QBittorrentClient({ url: 'http://localhost:8080', username: 'u', password: 'p' });
    vi.spyOn(QBittorrentClient.prototype, 'request').mockResolvedValue({ ok: true } as any);

    const result = await client.addTorrentsSafe({ torrents: ['ZmFrZXRvcnJlbnQ='] });

    expect(isOk(result)).toBe(true);
    expect(unsafeUnwrap(result)).toEqual(['abc123']);
  });

  it('returns err when request throws', async () => {
    const mockedParse = parseTorrent as unknown as Mock;
    mockedParse.mockResolvedValue({ infoHash: 'abc123' });

    const client = new QBittorrentClient({ url: 'http://localhost:8080', username: 'u', password: 'p' });
    vi.spyOn(QBittorrentClient.prototype, 'request').mockRejectedValue(new Error('network'));

    const result = await client.addTorrentsSafe({ torrents: ['ZmFrZXRvcnJlbnQ='] });

    expect(isErr(result)).toBe(true);
  });
});

describe('QBittorrentClient.getTorrents', () => {
  it('parses and returns torrents with tags array', async () => {
    const client = new QBittorrentClient({ url: 'http://localhost:8080', username: 'u', password: 'p' });

    const fakeResponse = {
      ok: true,
      json: async () => [
        {
          hash: 'abc123',
          name: 'Test Torrent',
          tags: ['one ', ' two'],
          size: '2048',
          progress: '0.5',
          state: 'downloading',
          save_path: '/downloads',
          added_on: '1700000000',
          amount_left: 0,
          auto_tmm: 1,
          availability: '1.5',
          category: '',
          completed: 0,
          completion_on: 0,
          content_path: '/downloads/Test Torrent',
          dl_limit: 0,
          dlspeed: 0,
          downloaded: '1024',
          downloaded_session: 10,
          eta: 123,
          f_l_piece_prio: 0,
          force_start: 1,
          last_activity: 1,
          magnet_uri: 'magnet:?xt=urn:btih:abc123',
          max_ratio: 1,
          max_seeding_time: 1,
          num_complete: 1,
          num_incomplete: 0,
          num_leechs: 0,
          num_seeds: 0,
          priority: 1,
          ratio: 1,
          ratio_limit: 1,
          seeding_time: 1,
          seeding_time_limit: 1,
          seen_complete: 1,
          seq_dl: 0,
          super_seeding: 0,
          time_active: 1,
          total_size: 2048,
          tracker: 'http://tracker',
          up_limit: 0,
          uploaded: 0,
          uploaded_session: 0,
          upspeed: 0,
        },
      ],
    } as any;

    vi.spyOn(QBittorrentClient.prototype, 'request').mockResolvedValue(fakeResponse as any);

    const result = await client.getTorrents({ hashes: ['abc123'] });

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].hash).toBe('abc123');
    expect(result[0].name).toBe('Test Torrent');
    expect(result[0].tags).toEqual(['one', 'two']);
    expect(result[0].auto_tmm).toBe(true);
    expect(result[0].size).toBe(2048);
    expect(result[0].progress).toBe(0.5);
    expect(result[0].state).toBe('downloading');
  });

  it('throws when response does not match schema', async () => {
    const client = new QBittorrentClient({ url: 'http://localhost:8080', username: 'u', password: 'p' });

    const badResponse = {
      ok: true,
      json: async () => [ { hash: 123 } ],
    } as any;

    vi.spyOn(QBittorrentClient.prototype, 'request').mockResolvedValue(badResponse as any);

    await expect(client.getTorrents({})).rejects.toThrow();
  });

  it('throws when state is not allowed', async () => {
    const client = new QBittorrentClient({ url: 'http://localhost:8080', username: 'u', password: 'p' });

    const badResponse = {
      ok: true,
      json: async () => [ { hash: 'abc123', state: 'invalid' } ],
    } as any;

    vi.spyOn(QBittorrentClient.prototype, 'request').mockResolvedValue(badResponse as any);

    await expect(client.getTorrents({})).rejects.toThrow();
  });
});
