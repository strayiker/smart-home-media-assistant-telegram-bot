import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type CookieStorage } from '../../utils/CookieStorage.js';
import { type Logger } from '../../utils/logger.js';
import { RutrackerSearchEngine } from '../rutrackerSearchEngine.js';

const noopLogger: Logger = {
  fatal: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
  silent: () => {},
};

const createCookieStorage = (): CookieStorage => {
  const cookies: Array<{ key: string; value: string }> = [];
  return {
    setCookies: vi.fn(),
    setCookie: vi.fn(),
    getCookies: vi.fn(() => cookies),
    getCookieString: vi.fn(() => 'bb_session=1'),
  } as unknown as CookieStorage;
};

describe('RutrackerSearchEngine.search', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('parses valid html and returns validated results', async () => {
    const html = `
      <html><body>
        <div class="log-out-icon"></div>
        <table class="forumline"><tbody>
          <tr data-topic_id="123">
            <td></td>
            <td></td>
            <td>Movies</td>
            <td><a href="viewtopic.php?t=123">Title</a></td>
            <td></td>
            <td data-ts_text="2048"><a href="dl.php?t=123">DL</a></td>
            <td>5</td>
            <td>1</td>
            <td></td>
            <td data-ts_text="1700000000"></td>
          </tr>
        </tbody></table>
      </body></html>
    `;

    globalThis.fetch = vi.fn(async () => {
      const buffer = Buffer.from(html, 'utf8');
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=windows-1251',
        },
      });
    }) as any;

    const engine = new RutrackerSearchEngine({
      username: 'u',
      password: 'p',
      cookieStorage: createCookieStorage(),
      logger: noopLogger,
    });

    const results = await engine.search('query');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: '123',
      title: 'Title',
      downloadUrl: 'https://rutracker.org/forum/dl.php?t=123',
      tags: ['Movies'],
      size: 2048,
      seeds: 5,
      peers: 1,
    });
  });

  it('throws when schema validation fails', async () => {
    const html = `
      <html><body>
        <div class="log-out-icon"></div>
        <table class="forumline"><tbody>
          <tr data-topic_id="123">
            <td></td>
            <td></td>
            <td>Movies</td>
            <td><a href="viewtopic.php?t=123">Title</a></td>
            <td></td>
            <td data-ts_text="not-a-number"><a href="dl.php?t=123">DL</a></td>
            <td>NaN</td>
            <td>NaN</td>
            <td></td>
            <td data-ts_text="invalid"></td>
          </tr>
        </tbody></table>
      </body></html>
    `;

    globalThis.fetch = vi.fn(async () => {
      const buffer = Buffer.from(html, 'utf8');
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=windows-1251',
        },
      });
    }) as any;

    const engine = new RutrackerSearchEngine({
      username: 'u',
      password: 'p',
      cookieStorage: createCookieStorage(),
      logger: noopLogger,
    });

    await expect(engine.search('query')).rejects.toThrow();
  });
});
