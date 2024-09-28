import './dayjs.js';

import { Bot, GrammyError, HttpError } from 'grammy';

import {
  botToken,
  cookiesFilePath,
  qbtSavePath,
  qbtWebuiHost,
  qbtWebuiPassword,
  qbtWebuiPort,
  qbtWebuiUsername,
  rutrackerPassword,
  rutrackerUsername,
} from './config.js';
import { logger } from './logger.js';
import { Torrents } from './middlewares/torrents.js';
import { QBittorrentClient } from './qBittorrent/QBittorrentClient.js';
import { RuTrackerEngine } from './searchEngines/RutrackerEngine.js';
import { CookieStorage } from './utils/CookieStorage.js';

const bot = new Bot(botToken);
const cookieStorage = new CookieStorage({
  filePath: cookiesFilePath,
  logger,
});
const rutracker = new RuTrackerEngine({
  username: rutrackerUsername,
  password: rutrackerPassword,
  cookieStorage,
  logger,
});
const qBittorrent = new QBittorrentClient({
  url: `http://${qbtWebuiHost}:${qbtWebuiPort}`,
  username: qbtWebuiUsername,
  password: qbtWebuiPassword,
  savePath: qbtSavePath,
});
const torrents = new Torrents({
  bot,
  engines: [rutracker],
  qBittorrent,
  logger,
});

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

logger.info('Bot is running!');

await promise;
