import dotenv from 'dotenv';

import { ConfigEnv } from './utils/ConfigEnv.js';

dotenv.config({
  path: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    `.env`,
  ],
});

const config = new ConfigEnv();

export const botToken = config.get('BOT_TOKEN', {
  required: true,
});
export const cookiesFilePath = config.get('COOKIES_FILE_PATH', {
  default: '/data/cookies.json',
});
export const rutrackerUsername = config.get('RUTRACKER_USERNAME', {
  required: true,
});
export const rutrackerPassword = config.get('RUTRACKER_PASSWORD', {
  required: true,
});
export const qbtWebuiHost = config.get('QBT_WEB_UII_HOST', {
  required: true,
});
export const qbtWebuiPort: number = config.get('QBT_WEB_UI_PORT', {
  required: true,
  parse: true,
});
export const qbtWebuiUsername = config.get('QBT_WEB_UI_USERNAME', {
  required: true,
});
export const qbtWebuiPassword = config.get('QBT_WEB_UI_PASSWORD', {
  required: true,
});
export const qbtSavePath = config.get('QBT_SAVE_PATH');
