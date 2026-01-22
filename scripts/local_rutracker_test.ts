import 'reflect-metadata';
import { RutrackerSearchEngine } from '../src/infrastructure/searchEngines/searchEngines/rutrackerSearchEngine.js';
import { CookieStorage } from '../src/shared/utils/CookieStorage.js';

import { logger } from '../src/logger.js';

// lightweight logger wrapper for scripts
const scriptLogger = {
  fatal: (...args: any[]) => (logger as any).fatal?.(...args),
  error: (...args: any[]) => (logger as any).error?.(...args),
  warn: (...args: any[]) => (logger as any).warn?.(...args),
  info: (...args: any[]) => (logger as any).info?.(...args),
  debug: (...args: any[]) => (logger as any).debug?.(...args),
  trace: (...args: any[]) => (logger as any).trace?.(...args),
  silent: () => {},
};

const cookieStorage = new CookieStorage({ filePath: './data/rutracker_cookies.json', logger: scriptLogger });

async function run() {
  const username = process.env.RUTRACKER_USERNAME;
  const password = process.env.RUTRACKER_PASSWORD;
  if (!username || !password) {
    scriptLogger.error('RUTRACKER_USERNAME / RUTRACKER_PASSWORD are required in env');
    process.exit(1);
  }

  const engine = new RutrackerSearchEngine({ username, password, cookieStorage, logger });
  try {
    const results = await engine.search('ubuntu');
    scriptLogger.info('Found %d results', results.length);
    scriptLogger.debug(results.slice(0, 5));
  } catch (err) {
    scriptLogger.error('Search error', err);
  }
}

run().catch((e) => {
  scriptLogger.error(e);
  process.exit(1);
});
