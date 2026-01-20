import dotenv from 'dotenv';

import { loadConfig } from './env.schema.js';

dotenv.config({
  path: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    `.env`,
  ],
});

const cfg = loadConfig();

export const secretKey = cfg.SECRET_KEY;
export const botToken = cfg.BOT_TOKEN;
export const botApiAddress = cfg.BOT_API_ADDRESS;
export const botDataPath = cfg.BOT_DATA_PATH ?? '/data/bot';
export const botDataTorrentsPath = cfg.BOT_DATA_TORRENTS_PATH ?? '/data/torrents';
export const rutrackerUsername = cfg.RUTRACKER_USERNAME;
export const rutrackerPassword = cfg.RUTRACKER_PASSWORD;
export const qbtWebuiAddress = cfg.QBT_WEBUI_ADDRESS ?? cfg.QBT_WEBUI_ADDRESS;
export const qbtWebuiUsername = cfg.QBT_WEBUI_USERNAME;
export const qbtWebuiPassword = cfg.QBT_WEBUI_PASSWORD;
export const qbtSavePath = cfg.QBT_SAVE_PATH;

export const appConfig = cfg;
