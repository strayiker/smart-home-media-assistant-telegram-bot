import 'reflect-metadata';
import './dayjs.js';

import { ZodError } from 'zod';

import { loadConfig } from './config/env.schema.js';

try {
  loadConfig();
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Configuration validation failed:', error.errors);
  } else {
    console.error('Unknown error during configuration load', error);
  }
  process.exit(1);
}

import path from 'node:path';

import { useFluent } from '@grammyjs/fluent';
import {
  Bot,
  GrammyError,
  HttpError,
  MemorySessionStorage,
  session,
} from 'grammy';

import { AuthComposer } from './composers/AuthComposer.js';
import { TorrentsComposer } from './composers/TorrentsComposer.js';
import {
  botApiAddress,
  botDataPath,
  botDataTorrentsPath,
  botToken,
  qbtSavePath,
  qbtWebuiAddress,
  qbtWebuiPassword,
  qbtWebuiUsername,
  rutrackerPassword,
  rutrackerUsername,
  secretKey,
} from './config.js';
import { type MyContext, type SessionData } from './Context.js';
import { container } from './di.js';
import { SearchService } from './domain/services/SearchService.js';
import { TorrentService } from './domain/services/TorrentService.js';
import { fluent } from './fluent.js';
import { startSessionCleanup } from './infrastructure/session/cleanup.js';
import { logger } from './logger.js';
import { initORM } from './orm.js';
import { QBittorrentClient } from './qBittorrent/QBittorrentClient.js';
import { RutrackerSearchEngine } from './searchEngines/RutrackerSearchEngine.js';
import { type SearchEngine } from './searchEngines/SearchEngine.js';
import { ChatSettingsRepository } from './utils/ChatSettingsRepository.js';
import { CookieStorage } from './utils/CookieStorage.js';
import { TorrentMetaRepository } from './utils/TorrentMetaRepository.js';

if (!qbtWebuiAddress || !qbtWebuiUsername || !qbtWebuiPassword) {
  throw new Error(
    'QBT_WEBUI_ADDRESS, QBT_WEBUI_USERNAME, QBT_WEBUI_PASSWORD are required',
  );
}

const botOptions: ConstructorParameters<typeof Bot<MyContext>>[1] =
  botApiAddress ? { client: { apiRoot: botApiAddress } } : {};

const bot = new Bot<MyContext>(botToken, botOptions);
const cookieStorage = new CookieStorage({
  filePath: path.join(botDataPath, 'cookies.json'),
  logger,
});
const qBittorrent = new QBittorrentClient({
  url: qbtWebuiAddress,
  username: qbtWebuiUsername,
  password: qbtWebuiPassword,
  savePath: qbtSavePath,
});

// Register QBittorrentClient in DI
container.registerInstance('QBittorrentClient', qBittorrent);

// Initialize ORM (run migrations on startup explicitly)
const orm = await initORM({ runMigrations: true });

// Register ORM in DI so components can obtain repositories / EM
container.registerInstance('ORM', orm);

// Start periodic session cleanup job (defaults to 1h interval)
const sessionCleanup = startSessionCleanup(orm);

const authComposer = new AuthComposer(orm.em.fork(), secretKey);
const chatSettingsRepository = new ChatSettingsRepository(orm.em.fork());
const torrentMetaRepository = new TorrentMetaRepository(orm.em.fork());

// Register TorrentMetaRepository in DI
container.registerInstance('TorrentMetaRepository', torrentMetaRepository);

// Register TorrentService as a factory
container.registerFactory('TorrentService', () => {
  return new TorrentService(
    container.resolve('QBittorrentClient'),
    container.resolve('TorrentMetaRepository'),
    container.resolve('Logger'),
  );
});

// Register SearchService as a factory
container.registerFactory('SearchService', () => {
  return new SearchService({
    searchEngines: [], // Will be populated later
    logger: container.resolve('Logger'),
  });
});

// Register SearchService as a factory
container.registerFactory('SearchService', () => {
  return new SearchService({
    searchEngines: [], // Will be populated later
    logger: container.resolve('Logger'),
  });
});

const searchEngines: SearchEngine[] = [];

if (rutrackerUsername && rutrackerPassword) {
  searchEngines.push(
    new RutrackerSearchEngine({
      username: rutrackerUsername,
      password: rutrackerPassword,
      cookieStorage,
      logger,
    }),
  );
} else {
  logger.warn('Rutracker credentials are missing; search engine is disabled');
}

// Update SearchService with actual search engines
const searchService = container.resolve('SearchService') as SearchService;
searchService.setSearchEngines(searchEngines);

const torrentsComposer = new TorrentsComposer({
  bot,
  dataPath: botDataTorrentsPath,
  em: orm.em.fork(),
  searchEngines,
  qBittorrent,
  logger,
});

bot.use(
  session({
    initial: () => ({}),
    storage: new MemorySessionStorage<SessionData>(),
  }),
);
bot.use(async (ctx, next) => {
  const locale = ctx.from?.language_code;
  if (locale && ctx.chatId !== undefined) {
    try {
      await chatSettingsRepository.upsertLocale(ctx.chatId, locale);
    } catch (error) {
      logger.warn(error, 'Failed to persist chat locale');
    }
  }
  await next();
});
bot.use(
  useFluent({
    fluent,
    defaultLocale: 'en',
  }),
);
bot.use(authComposer);
bot.use(torrentsComposer);

// eslint-disable-next-line unicorn/prefer-top-level-await
bot.catch(({ error }) => {
  if (error instanceof GrammyError) {
    logger.error(error, 'Error in request');
  } else if (error instanceof HttpError) {
    logger.error(error, 'Could not contact Telegram');
  } else {
    logger.error(error, 'Unknown error');
  }
});

const shutdown = async () => {
  await bot.stop();
  await torrentsComposer.dispose();
  if (sessionCleanup) await sessionCleanup.stop();
  await orm.close(true);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const promise = bot.start();

logger.info('Bot is running!');
logger.info('Your secret key is : %s', secretKey);

await promise;
