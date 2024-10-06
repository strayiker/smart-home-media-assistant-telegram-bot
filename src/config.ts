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
