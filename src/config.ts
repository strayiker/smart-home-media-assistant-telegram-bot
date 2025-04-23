import dotenv from 'dotenv';

import { ConfigEnv } from './utils/ConfigEnv.js';

dotenv.config({
  path: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    `.env`,
  ],
});

export const config = new ConfigEnv();

export const secretKey = config.get('SECRET_KEY', { required: true });

export const botToken = config.get('BOT_TOKEN', {
  required: true,
});

export const botApiAddress = config.get('BOT_API_ADDRESS', {
  required: true,
});

export const botDataPath = config.get('BOT_DATA_PATH', {
  default: '/data/bot',
});

export const botDataTorrentsPath = config.get('BOT_DATA_TORRENTS_PATH', {
  default: '/data/torrents',
});

export const rutrackerUsername = config.get('RUTRACKER_USERNAME', {
  required: true,
});

export const rutrackerPassword = config.get('RUTRACKER_PASSWORD', {
  required: true,
});

export const qbtWebuiAddress = config.get('QBT_WEB_UI_ADDRESS', {
  required: true,
});

export const qbtWebuiUsername = config.get('QBT_WEB_UI_USERNAME', {
  required: true,
});

export const qbtWebuiPassword = config.get('QBT_WEB_UI_PASSWORD', {
  required: true,
});

export const qbtSavePath = config.get('QBT_SAVE_PATH');
