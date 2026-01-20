import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleSearchMessage } from '../SearchHandler.js';

describe('SearchHandler', () => {
  let mockSearchService: any;
  let mockLogger: any;
  let ctx: any;

  beforeEach(() => {
    mockSearchService = { search: vi.fn() };
    mockLogger = { error: vi.fn() };

    ctx = {
      message: { text: 'query' },
      reply: vi.fn(),
      t: (k: string) => k,
    };
  });

  it('replies with aggregated results when search succeeds', async () => {
    mockSearchService.search.mockResolvedValue({
      ok: true,
      value: [
        { title: 'a', size: 1 },
        { title: 'b', size: 2 },
      ],
    });
    await handleSearchMessage(ctx as any, mockSearchService, mockLogger);
    expect(ctx.reply).toHaveBeenCalled();
  });

  it('replies with empty message when no results', async () => {
    mockSearchService.search.mockResolvedValue({ ok: true, value: [] });
    await handleSearchMessage(ctx as any, mockSearchService, mockLogger);
    expect(ctx.reply).toHaveBeenCalledWith('search-empty-results');
  });

  it('handles service error', async () => {
    mockSearchService.search.mockResolvedValue({
      ok: false,
      error: new Error('fail'),
    });
    await handleSearchMessage(ctx as any, mockSearchService, mockLogger);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('search-unknown-error');
  });
});
