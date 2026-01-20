import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleListFilesCommand } from '../FileHandler.js';

describe('FileHandler', () => {
  let mockFileService: any;
  let mockLogger: any;
  let ctx: any;

  beforeEach(() => {
    mockFileService = { listFilesByUid: vi.fn() };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: '/files_uid123' },
      reply: vi.fn(),
      t: (k: string) => k,
    };
  });

  it('replies with file list when service succeeds', async () => {
    mockFileService.listFilesByUid.mockResolvedValue(['0: a.mkv — 1MB — /dl_file_uid123_0']);
    await handleListFilesCommand(ctx, mockFileService, mockLogger);
    expect(mockFileService.listFilesByUid).toHaveBeenCalledWith('uid123');
    expect(ctx.reply).toHaveBeenCalled();
  });

  it('replies empty message when list is empty', async () => {
    mockFileService.listFilesByUid.mockResolvedValue([]);
    await handleListFilesCommand(ctx, mockFileService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('files-empty');
  });

  it('replies error when service throws', async () => {
    mockFileService.listFilesByUid.mockRejectedValue(new Error('fail'));
    await handleListFilesCommand(ctx, mockFileService, mockLogger);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('files-error');
  });
});
