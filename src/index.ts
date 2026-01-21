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
import {
  botApiAddress,
  botDataPath,
  botDataTorrentsPath,
  botRegisterCommands,
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
import { FileService } from './domain/services/FileService.js';
import { SearchService } from './domain/services/SearchService.js';
import { TorrentService } from './domain/services/TorrentService.js';
import { fluent } from './fluent.js';
import { startSessionCleanup } from './infrastructure/session/cleanup.js';
import { logger } from './logger.js';
import { initORM } from './orm.js';
import type { CommandsRegistry } from './presentation/bot/CommandsRegistry.js';
import { type DownloadHandler } from './presentation/bot/handlers/DownloadHandler.js';
import { type SearchHandler } from './presentation/bot/handlers/SearchHandler.js';
import { type TorrentHandler } from './presentation/bot/handlers/TorrentHandler.js';
import { createDIContainerMiddleware } from './presentation/bot/middleware/diContainerMiddleware.js';
import { errorMiddleware } from './presentation/bot/middleware/ErrorMiddleware.js';
import { registerCommandsIfNeeded } from './presentation/bot/registerCommands.js';
import { QBittorrentClient } from './qBittorrent/QBittorrentClient.js';
import { RutrackerSearchEngine } from './searchEngines/RutrackerSearchEngine.js';
import { type SearchEngine } from './searchEngines/SearchEngine.js';
import { ChatSettingsRepository } from './infrastructure/persistence/repositories/ChatSettingsRepository.js';
import { CookieStorage } from './shared/utils/CookieStorage.js';
import { TorrentMetaRepository } from './infrastructure/persistence/repositories/TorrentMetaRepository.js';

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
container.registerInstance('BotDataPath', botDataPath);
container.registerInstance('BotDataTorrentsPath', botDataTorrentsPath);

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

// Register FileService as a factory
container.registerFactory('FileService', () => {
  return new FileService({
    qBittorrent: container.resolve('QBittorrentClient'),
    torrentMetaRepository: container.resolve('TorrentMetaRepository'),
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

// Register SearchEngines in DI after initialization
container.registerInstance('SearchEngines', searchEngines);

bot.use(createDIContainerMiddleware());
bot.use(errorMiddleware);
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

// Register new handlers from DI
const searchHandler = container.resolve<SearchHandler>('SearchHandler');
const torrentHandler = container.resolve<TorrentHandler>('TorrentHandler');
const downloadHandler = container.resolve<DownloadHandler>('DownloadHandler');

bot.use(searchHandler);
bot.use(torrentHandler);
bot.use(downloadHandler);

// Attempt to register aggregated, localized commands with Telegram API.
try {
  const commandsRegistry =
    container.resolve<CommandsRegistry>('CommandsRegistry');
  const shouldRegister =
    Boolean(botRegisterCommands) && process.env.NODE_ENV !== 'test';
  await registerCommandsIfNeeded({
    bot,
    commandsRegistry,
    locale: process.env.BOT_COMMANDS_LOCALE ?? 'en',
    shouldRegister,
  });
} catch (error) {
  logger.warn(error, 'Error while preparing bot commands');
}

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
  if (sessionCleanup) await sessionCleanup.stop();
  await orm.close(true);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const promise = bot.start();

logger.info('Bot is running!');
logger.info('Your secret key is : %s', secretKey);

await promise;
