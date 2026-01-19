import './dayjs.js';

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
import { fluent } from './fluent.js';
import { logger } from './logger.js';
import { orm } from './orm.js';
import { QBittorrentClient } from './qBittorrent/QBittorrentClient.js';
import { RutrackerSearchEngine } from './searchEngines/RutrackerSearchEngine.js';
import { ChatSettingsRepository } from './utils/ChatSettingsRepository.js';
import { CookieStorage } from './utils/CookieStorage.js';

const bot = new Bot<MyContext>(botToken, {
  client: {
    apiRoot: botApiAddress,
  },
});
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
const authComposer = new AuthComposer(orm.em.fork(), secretKey);
const chatSettingsRepository = new ChatSettingsRepository(orm.em.fork());
const torrentsComposer = new TorrentsComposer({
  bot,
  dataPath: botDataTorrentsPath,
  em: orm.em.fork(),
  searchEngines: [
    new RutrackerSearchEngine({
      username: rutrackerUsername,
      password: rutrackerPassword,
      cookieStorage,
      logger,
    }),
  ],
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
  await orm.close(true);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const promise = bot.start();

logger.info('Bot is running!');
logger.info('Your secret key is : %s', secretKey);

await promise;
