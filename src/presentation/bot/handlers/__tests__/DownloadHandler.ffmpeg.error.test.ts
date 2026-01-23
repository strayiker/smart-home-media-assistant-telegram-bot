import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';

// Mock fluent-ffmpeg before importing the handler
vi.mock('fluent-ffmpeg', () => {
  return {
    default: (filePath) => {
      const events = new Map();
      const emitter: any = {
        outputOptions: () => emitter,
        outputFormat: () => emitter,
        on: (ev: string, cb: Function) => {
          events.set(ev, cb);
          return emitter;
        },
        saveToFile: (_file: string) => {
          (globalThis as any).__lastFfmpeg = {
            emit: (ev: string, payload?: any) => {
              const cb = events.get(ev);
              if (cb) return cb(payload);
            },
          };
        },
      };
      return emitter;
    },
  };
});

import { handleDownloadFileCommand } from '../DownloadHandler';

describe('DownloadHandler ffmpeg error handling', () => {
  beforeEach(() => {});
  afterEach(() => {
    delete (globalThis as any).__lastFfmpeg;
    vi.restoreAllMocks();
  });

  it('replies with error and cleans tmp on ffmpeg error', async () => {
    const mockTorrentService: any = {
      getTorrentByUid: vi.fn().mockResolvedValue({ hash: 'h' }),
      getTorrentFiles: vi
        .fn()
        .mockResolvedValue([
          { index: 0, name: 'big.mp4', size: 10 * 1024 * 1024 * 1024 },
        ]),
      getTorrentsByHash: vi.fn().mockResolvedValue([]),
    };
    const mockMediaService: any = {
      isVideo: vi.fn().mockReturnValue(true),
      getFileType: vi.fn().mockResolvedValue({ mime: 'video/mp4' }),
      getVideoMetadata: vi.fn().mockResolvedValue({
        format: { duration: 600 },
        streams: [{ codec_type: 'video', width: 1280, height: 720 }],
      }),
    };

    const replied: any[] = [];
    const ctx: any = {
      message: { text: '/dl_file_engine_1_0' },
      t: (k: string) => (k === 'torrent-file-error' ? 'ERR' : k),
      reply: vi.fn().mockImplementation((...args: any[]) => {
        replied.push(args);
        return Promise.resolve({});
      }),
      api: { editMessageText: vi.fn().mockResolvedValue({}) },
      replyWithVideo: vi.fn().mockResolvedValue({}),
    };

    const rmSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {});

    await handleDownloadFileCommand(
      ctx,
      mockTorrentService,
      mockMediaService,
      '/tmp/test',
      console,
    );

    const ctrl = (globalThis as any).__lastFfmpeg;
    expect(ctrl).toBeDefined();

    // Emit error
    const err = new Error('boom');
    ctrl.emit('error', err);

    // let async handlers settle
    await new Promise((res) => setImmediate(res));

    // Expect that bot replied with error message
    expect(
      replied.some(
        (r) =>
          r[0] === 'ERR' ||
          (r[0] && r[0].includes && r[0].includes('torrent-file-error')),
      ),
    ).toBeTruthy();
    // tmp file cleanup should be attempted
    expect(rmSpy).toHaveBeenCalled();
  });
});
