import { pino } from 'pino';
import pinoPretty from 'pino-pretty';

const prettyStream = pinoPretty({
  colorize: true,
  ignore: 'pid,hostname',
  singleLine: true,
  translateTime: 'SYS:standard',
});

export const logger =
  process.env.NODE_ENV === 'production'
    ? pino({ level: 'info' }, prettyStream)
    : pino({ level: 'debug' }, prettyStream);
