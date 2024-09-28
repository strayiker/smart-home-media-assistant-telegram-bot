import * as cheerio from 'cheerio';

import { type CookieStorage } from '../utils/CookieStorage.js';
import { type Logger } from '../utils/Logger.js';
import { Engine, type SearchResult } from './Engine.js';

const BASE_URL = 'https://rutracker.org/forum';
const LOGIN_URL = `${BASE_URL}/login.php`;
const SEARCH_URL = `${BASE_URL}/tracker.php`;
const DOWNLOAD_URL = `${BASE_URL}/dl.php`;

export interface RuTrackerEngineOptions {
  username: string;
  password: string;
  cookieStorage: CookieStorage;
  logger: Logger;
}

export class RuTrackerEngine extends Engine {
  public name = 'rutracker';
  private username: string;
  private password: string;
  private cookieStorage: CookieStorage;
  private logger: Logger;

  constructor(options: RuTrackerEngineOptions) {
    super();

    this.username = options.username;
    this.password = options.password;
    this.cookieStorage = options.cookieStorage;
    this.logger = options.logger;
  }

  private async login() {
    try {
      const formData = new URLSearchParams();
      formData.append('login_username', this.username);
      formData.append('login_password', this.password);
      formData.append('login', 'Вход');

      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        redirect: 'manual',
      });

      const cookies = response.headers.getSetCookie();
      this.cookieStorage.setCookies(cookies, LOGIN_URL);

      this.logger.debug('Successfully logged in');
    } catch (error) {
      this.logger.error(error, 'An error occured while logging in');
    }
  }

  private async ensureLoggedIn() {
    const cookies = this.cookieStorage.getCookies(LOGIN_URL);
    const hasSession = cookies.some((cookie) => cookie.key === 'bb_session');
    if (!hasSession) {
      await this.login();
    }
  }

  private parseDate(dateString?: string) {
    if (!dateString) {
      return;
    }
    const unix = Number.parseInt(dateString);
    return new Date(unix * 1000);
  }

  async search(query: string): Promise<SearchResult[]> {
    await this.ensureLoggedIn();

    const response = await fetch(`${SEARCH_URL}?nm=${query}`, {
      headers: {
        Cookie: this.cookieStorage.getCookieString(LOGIN_URL),
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder('Windows-1251');
    const $ = cheerio.load(decoder.decode(arrayBuffer));

    const loggedIn = $('.log-out-icon').length > 0;

    if (!loggedIn) {
      this.logger.debug('Session expired, trying login again...');
      await this.login();
    }

    const results: SearchResult[] = [];
    const rows = $('table.forumline tbody tr');

    for (const row of rows) {
      const tds = $(row).find('td');
      const id = $(row).attr('data-topic_id');

      if (!id) {
        const html = $(row).html();
        this.logger.warn('Unable to parse RuTracker torrent id', html);
        continue;
      }

      const title = tds.eq(3).find('a').text();
      const totalSize = Number.parseInt(tds.eq(5).attr('data-ts_text') ?? '0');
      const seeds = Number.parseInt(tds.eq(6).text()) ?? 0;
      const leeches = Number.parseInt(tds.eq(7).text()) ?? 0;
      const date = this.parseDate(tds.eq(9).attr('data-ts_text'));
      const trackerUrl = tds.eq(3).find('a').attr('href');
      const downloadUrl = tds.eq(5).find('a').attr('href');

      if (title && trackerUrl && downloadUrl) {
        results.push({
          id,
          title,
          totalSize,
          seeds,
          leeches,
          date,
          trackerUrl: `${BASE_URL}/${trackerUrl}`,
          downloadUrl: `${BASE_URL}/${downloadUrl}`,
        });
      }
    }

    return results.reverse();
  }

  async downloadTorrentFile(id: string) {
    await this.ensureLoggedIn();

    const url = `${DOWNLOAD_URL}?t=${id}`;
    const response = await fetch(url, {
      headers: {
        Cookie: this.cookieStorage.getCookieString(LOGIN_URL),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download torrent file: ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }
}
