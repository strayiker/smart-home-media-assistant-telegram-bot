import { URLSearchParams } from 'node:url';

import parseTorrent from 'parse-torrent';
import { CookieJar } from 'tough-cookie';

import { err, ok, type ResultT } from '../../../shared/utils/result.js';
import { type QBFile, type QBTorrent } from './models.js';
import { normalizeTorrent, QBTorrentsResponseSchema } from './schemas.js';
import {
  type QBClientAddTorrentsOptions,
  type QBClientGetTorrentsOptions,
} from './types.js';

interface QBClientOptions {
  url: string;
  username: string;
  password: string;
  savePath?: string | undefined;
}

export class QBittorrentClient {
  private username: string;
  private password: string;
  private savePath: string | undefined;
  private cookieJar: CookieJar = new CookieJar();
  private apiBase: string;

  constructor(options: QBClientOptions) {
    this.username = options.username;
    this.password = options.password;
    this.savePath = options.savePath;
    this.apiBase = `${options.url}/api/v2`;
  }

  private async login() {
    const url = `${this.apiBase}/auth/login`;
    const data = new URLSearchParams({
      username: this.username,
      password: this.password,
    });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
      redirect: 'manual',
    });

    const cookies = response.headers.getSetCookie();

    for (const cookie of cookies) {
      this.cookieJar.setCookieSync(cookie, url);
    }
  }

  private async ensureLoggedIn() {
    const url = `${this.apiBase}/auth/login`;
    const cookies = this.cookieJar.getCookiesSync(url);
    const hasSessionId = cookies.some((cookie) => cookie.key === 'SID');

    if (!hasSessionId) {
      await this.login();
    }
  }

  async performRequest(url: string, init?: RequestInit) {
    return fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        Cookie: this.cookieJar.getCookieStringSync(url),
      },
    });
  }

  async request(url: string, init?: RequestInit) {
    await this.ensureLoggedIn();

    let response = await this.performRequest(url, init);

    if (response.status === 403) {
      await this.login();
      response = await this.performRequest(url, init);
    }

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return response;
  }

  async addTorrents({
    torrents = [],
    tags,
    savepath = this.savePath,
    ...rest
  }: QBClientAddTorrentsOptions): Promise<ResultT<string[], unknown>> {
    const data = new FormData();
    const hashes: string[] = [];

    if (savepath) {
      data.append('savepath', savepath);
    }

    if (tags) {
      data.append('tags', tags.join(','));
    }

    for (const [key, value] of Object.entries(rest)) {
      data.append(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    }

    for (const torrent of torrents) {
      const buffer = Buffer.from(torrent, 'base64');
      const { infoHash } = await parseTorrent(buffer);

      if (infoHash) {
        hashes.push(infoHash);
        data.append('torrents', new Blob([buffer]), `${infoHash}.torrent`);
      }
    }

    await this.request(`${this.apiBase}/torrents/add`, {
      method: 'POST',
      body: data,
    });

    return ok(hashes);
  }

  async addTorrentsSafe(
    opts: QBClientAddTorrentsOptions,
  ): Promise<ResultT<string[], unknown>> {
    try {
      return await this.addTorrents(opts);
    } catch (error) {
      return err(error as unknown);
    }
  }

  async getTorrents({
    hashes,
    ...rest
  }: QBClientGetTorrentsOptions): Promise<QBTorrent[]> {
    const data = new URLSearchParams();

    if (hashes) {
      data.append('hashes', hashes.join('|'));
    }

    for (const [key, value] of Object.entries(rest)) {
      data.append(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    }

    const response = await this.request(`${this.apiBase}/torrents/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });

    const json = await response.json();

    const parsed = QBTorrentsResponseSchema.parse(json);

    return parsed.map((t) => normalizeTorrent(t));
  }

  async pauseTorrents(hashes: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));

    await this.request(`${this.apiBase}/torrents/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async resumeTorrents(hashes: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));

    await this.request(`${this.apiBase}/torrents/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async deleteTorrents(hashes: Array<string>, deleteFiles: boolean) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));
    data.append('deleteFiles', JSON.stringify(deleteFiles));

    await this.request(`${this.apiBase}/torrents/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async recheckTorrents(hashes: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));

    await this.request(`${this.apiBase}/torrents/recheck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async setTorrentsLocation(hashes: string[], location: string) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));
    data.append('location', location);

    await this.request(`${this.apiBase}/torrents/setLocation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async setTorrentsTopPrio(hashes: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));

    await this.request(`${this.apiBase}/torrents/topPrio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async setTorrentsBottomPrio(hashes: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));

    await this.request(`${this.apiBase}/torrents/bottomPrio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async addTorrentsTags(hashes: string[], tags: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));
    data.append('tags', tags.join(','));

    await this.request(`${this.apiBase}/torrents/addTags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async removeTorrentsTags(hashes: string[], tags?: string[]) {
    const data = new URLSearchParams();

    data.append('hashes', hashes.join('|'));
    data.append('tags', tags?.join(',') ?? '');

    await this.request(`${this.apiBase}/torrents/removeTags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });
  }

  async getTorrentFiles(hash: string, indexes?: number[]) {
    const data = new URLSearchParams();

    data.append('hash', hash);

    if (indexes) {
      data.append('indexes', indexes.join('|'));
    }

    const response = await this.request(`${this.apiBase}/torrents/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
    });

    return response.json() as Promise<QBFile[]>;
  }
}
