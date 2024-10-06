import './dayjs.js';

import { useFluent } from '@grammyjs/fluent';
import { Bot, GrammyError, HttpError } from 'grammy';

import { TorrentsComposer } from './composers/TorrentsComposer.js';
import { config } from './config.js';
import { type MyContext } from './Context.js';
import { fluent } from './fluent.js';
import { logger } from './logger.js';
import { QBittorrentClient } from './qBittorrent/QBittorrentClient.js';
import { RutrackerSearchEngine } from './searchEngines/RutrackerSearchEngine.js';
import { CookieStorage } from './utils/CookieStorage.js';

const botToken = config.get('BOT_TOKEN', {
  required: true,
});
const cookiesFilePath = config.get('COOKIES_FILE_PATH', {
  default: '/data/cookies.json',
});
const rutrackerUsername = config.get('RUTRACKER_USERNAME', {
  required: true,
});
const rutrackerPassword = config.get('RUTRACKER_PASSWORD', {
  required: true,
});
const qbtWebuiHost = config.get('QBT_WEB_UI_HOST', {
  required: true,
});
const qbtWebuiPort: number = config.get('QBT_WEB_UI_PORT', {
  required: true,
  parse: true,
});
const qbtWebuiUsername = config.get('QBT_WEB_UI_USERNAME', {
  required: true,
});
const qbtWebuiPassword = config.get('QBT_WEB_UI_PASSWORD', {
  required: true,
});
const qbtSavePath = config.get('QBT_SAVE_PATH');

const bot = new Bot<MyContext>(botToken);
const cookieStorage = new CookieStorage({
  filePath: cookiesFilePath,
  logger,
});
const qBittorrent = new QBittorrentClient({
  url: `http://${qbtWebuiHost}:${qbtWebuiPort}`,
  username: qbtWebuiUsername,
  password: qbtWebuiPassword,
  savePath: qbtSavePath,
});
const torrents = new TorrentsComposer({
  bot,
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
