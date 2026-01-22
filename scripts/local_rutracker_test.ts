import 'reflect-metadata';
import { RutrackerSearchEngine } from '../src/infrastructure/searchEngines/searchEngines/rutrackerSearchEngine.js';
import { CookieStorage } from '../src/shared/utils/CookieStorage.js';

const logger = {
  fatal: (...args: any[]) => console.error('[FATAL]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  info: (...args: any[]) => console.log('[INFO]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
  trace: (...args: any[]) => console.trace('[TRACE]', ...args),
  silent: () => {},
};

const cookieStorage = new CookieStorage({ filePath: './data/rutracker_cookies.json', logger });

async function run() {
  const username = process.env.RUTRACKER_USERNAME;
  const password = process.env.RUTRACKER_PASSWORD;
  if (!username || !password) {
    console.error('RUTRACKER_USERNAME / RUTRACKER_PASSWORD are required in env');
    process.exit(1);
  }

  const engine = new RutrackerSearchEngine({ username, password, cookieStorage, logger });
  try {
    const results = await engine.search('ubuntu');
    console.log('Found', results.length, 'results');
    console.log(results.slice(0, 5));
  } catch (err) {
    console.error('Search error', err);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
