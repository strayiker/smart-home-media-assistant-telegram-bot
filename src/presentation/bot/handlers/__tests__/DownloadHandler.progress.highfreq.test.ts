import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fluent-ffmpeg before importing the handler
vi.mock('fluent-ffmpeg', () => {
  return {
    default: (_filePath: string) => {
      const events = new Map();
      const emitter: any = {
        outputOptions: () => emitter,
        outputFormat: () => emitter,
        on: (ev: string, cb: (...args: any[]) => void) => {
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

describe('DownloadHandler high-frequency progress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).__lastFfmpeg;
  });

  it('only performs one edit for many rapid progress events', async () => {
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
    const edits: any[] = [];
    const ctx: any = {
      message: { text: '/dl_file_engine_1_0' },
      t: (k: string, p?: any) =>
        k === 'torrent-file-compressing' ? `compress ${p?.progress}` : k,
      reply: vi
        .fn()
        .mockResolvedValue({ chat: { id: 1 }, message_id: 42, text: '' }),
      api: {
        editMessageText: vi
          .fn()
          .mockImplementation((chatId, msgId, text) =>
            edits.push({ chatId, msgId, text }),
          ),
      },
      replyWithVideo: vi.fn().mockResolvedValue({}),
    };

    await handleDownloadFileCommand(
      ctx,
      mockTorrentService,
      mockMediaService,
      '/tmp/test',
      console,
    );

    const ctrl = (globalThis as any).__lastFfmpeg;
    expect(ctrl).toBeDefined();

    // Emit many rapid progress events without advancing timers
    for (let i = 1; i <= 20; i++) {
      ctrl.emit('progress', { percent: i });
    }

    // Only the first should cause an immediate edit (debounced)
    await Promise.resolve();
    expect(edits.length).toBe(1);

    // Advance time and emit another progress -> should cause second edit
    vi.advanceTimersByTime(1600);
    ctrl.emit('progress', { percent: 50 });
    await Promise.resolve();
    expect(edits.length).toBe(2);
  });
});
