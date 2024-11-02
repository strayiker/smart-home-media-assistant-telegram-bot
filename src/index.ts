import './dayjs.js';

import path from 'node:path';

import { useFluent } from '@grammyjs/fluent';
import { Bot, GrammyError, HttpError } from 'grammy';

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
} from './config.js';
import { type MyContext } from './Context.js';
import { fluent } from './fluent.js';
import { logger } from './logger.js';
import { QBittorrentClient } from './qBittorrent/QBittorrentClient.js';
import { RutrackerSearchEngine } from './searchEngines/RutrackerSearchEngine.js';
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
const torrents = new TorrentsComposer({
  bot,
  dataPath: botDataTorrentsPath,
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
  useFluent({
    fluent,
    defaultLocale: 'en',
  }),
);
bot.use(torrents);

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
  await torrents.dispose();
  await bot.stop();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const promise = bot.start();

logger.debug('Bot is running!');

await promise;
