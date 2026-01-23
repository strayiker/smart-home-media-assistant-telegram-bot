import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('DownloadHandler progress debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).__lastFfmpeg;
  });

  it('debounces progress edits and only updates on percent change', async () => {
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
        format: { duration: 1200 },
        streams: [{ codec_type: 'video', width: 1920, height: 1080 }],
      }),
    };
    const mockLogger: any = { debug: vi.fn(), error: vi.fn(), warn: vi.fn() };

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

    // Start handler (will create progress message and start ffmpeg mock)
    await handleDownloadFileCommand(
      ctx,
      mockTorrentService,
      mockMediaService,
      '/tmp/test',
      mockLogger,
    );

    const ctrl = (globalThis as any).__lastFfmpeg;
    expect(ctrl).toBeDefined();

    // Emit first progress -> should trigger an edit
    ctrl.emit('progress', { percent: 10 });
    // let microtasks run
    await Promise.resolve();
    expect(edits.length).toBe(1);

    // Emit immediate next progress with different percent -> should be debounced (no new edit)
    ctrl.emit('progress', { percent: 20 });
    await Promise.resolve();
    expect(edits.length).toBe(1);

    // Advance time beyond debounce (1500ms) and emit same percent -> since the immediate 20 was debounced,
    // lastPercent is still 10, so emitting 20 now SHOULD cause a second edit
    vi.advanceTimersByTime(1600);
    ctrl.emit('progress', { percent: 20 });
    await Promise.resolve();
    expect(edits.length).toBe(2);

    // Advance time and emit new percent -> should cause third edit
    vi.advanceTimersByTime(1600);
    ctrl.emit('progress', { percent: 45 });
    await Promise.resolve();
    expect(edits.length).toBe(3);
  });
});
