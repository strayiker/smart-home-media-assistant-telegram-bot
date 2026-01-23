import fs from 'node:fs';

import { CookieJar } from 'tough-cookie';

import { type Logger } from './logger.js';

export interface CookieStorageOptions {
  filePath: string;
  logger: Logger;
}

export class CookieStorage {
  private filePath: string;
  private logger: Logger;
  private cookieJar: CookieJar = new CookieJar();

  constructor(options: CookieStorageOptions) {
    this.filePath = options.filePath;
    this.logger = options.logger;
    this.loadFromFs();
  }

  private flushToFs() {
    const json = JSON.stringify(this.cookieJar.toJSON());
    fs.writeFileSync(this.filePath, json);
  }

  private loadFromFs() {
    try {
      const json = fs.readFileSync(this.filePath, 'utf8');
      this.cookieJar = CookieJar.fromJSON(json);
    } catch {
      this.logger.debug(`Unable to load cookies from ${this.filePath}`);
    }
  }

  setCookie(cookieString: string, url: string) {
    const cookie = this.cookieJar.setCookieSync(cookieString, url);
    this.flushToFs();
    return cookie;
  }

  setCookies(cookieStrings: string[], url: string) {
    const cookies = cookieStrings.map((cookieString) => {
      return this.cookieJar.setCookieSync(cookieString, url);
    });
    this.flushToFs();
    return cookies;
  }

  getCookies(url: string) {
    return this.cookieJar.getCookiesSync(url);
  }

  getCookieString(url: string) {
    return this.cookieJar.getCookieStringSync(url);
  }
}
