import { describe, expect, it, vi } from 'vitest';

// Mock fluent-ffmpeg before importing the handler
vi.mock('fluent-ffmpeg', () => {
  return {
    default: (_filePath: string) => {
      const events = new Map<string, (...args: any[]) => void>();
      const emitter: any = {
        outputOptions: () => emitter,
        outputFormat: () => emitter,
        on: (ev: string, cb: (...args: any[]) => void) => {
          events.set(ev, cb);
          return emitter;
        },
        saveToFile: (_file: string) => {
          // expose control to test via global
          (globalThis as any).__lastFfmpeg = {
            emit: (ev: string, payload?: any) => {
              const cb = events.get(ev);
              if (cb) cb(payload);
            },
          };
        },
      };
      return emitter;
    },
  };
});

import fs from 'node:fs';

import { handleDownloadFileCommand } from '../DownloadHandler.js';

describe('DownloadHandler ffmpeg flow', () => {
  it('sends video once after end and cleans up tmp file', async () => {
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

    // Build ctx with promise-resolvable replyWithVideo
    let resolveSend: Function | null = null;
    const sendPromise = new Promise<void>((res) => {
      resolveSend = res;
    });

    const ctx: any = {
      message: { text: '/dl_file_engine_1_0' },
      t: (k: string, p?: any) =>
        k === 'torrent-file-compressing' ? `compress ${p?.progress}` : k,
      reply: vi
        .fn()
        .mockResolvedValue({ chat: { id: 1 }, message_id: 42, text: '' }),
      api: { editMessageText: vi.fn().mockResolvedValue({}) },
      replyWithVideo: vi.fn().mockImplementation(async () => {
        if (resolveSend) resolveSend();
        return {};
      }),
    };

    // Spy on fs.rmSync to ensure cleanup called
    const rmSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => {});

    // Start the flow (this will start ffmpeg via our mock and return)
    await handleDownloadFileCommand(
      ctx,
      mockTorrentService,
      mockMediaService,
      '/tmp/test',
      mockLogger,
    );

    // Get mock ffmpeg controller and emit progress then end
    const ctrl = (globalThis as any).__lastFfmpeg;
    expect(ctrl).toBeDefined();

    // Emit a couple of progress events
    ctrl.emit('progress', { percent: 10 });
    ctrl.emit('progress', { percent: 55 });

    // Emit end to trigger send
    ctrl.emit('end');

    // Wait until replyWithVideo was invoked
    await sendPromise;

    // Wait (with timeout) until cleanup has been called
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (rmSpy.mock.calls.length > 0) return resolve();
        if (Date.now() - start > 2000)
          return reject(new Error('cleanup timeout'));
        setTimeout(check, 20);
      };
      check();
    });

    expect(ctx.api.editMessageText).toHaveBeenCalled();
    expect(ctx.replyWithVideo).toHaveBeenCalledTimes(1);
    expect(rmSpy).toHaveBeenCalled();

    rmSpy.mockRestore();
  });
});
