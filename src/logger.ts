import { pino } from 'pino';
import pinoPretty from 'pino-pretty';

const prettyStream = pinoPretty({
  colorize: true,
  ignore: 'pid,hostname',
  singleLine: true,
  translateTime: 'SYS:standard',
});

const level =
  process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({ level }, prettyStream);

