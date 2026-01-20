import { type NextFunction } from 'grammy';

import { logger } from '../../../logger.js';

export async function errorMiddleware(ctx: unknown, next: NextFunction) {
  try {
    await next();
  } catch (error) {
    try {
      logger.error(error as unknown, 'Handler error');
    } catch {
      // ignore logging failures
    }

    try {
      // safe check for ctx.reply
      if (
        typeof ctx === 'object' &&
        ctx !== null &&
        'reply' in ctx &&
        typeof (ctx as { reply?: unknown }).reply === 'function'
      ) {
        const ctxWithReply = ctx as {
          reply?: (msg: string) => Promise<unknown>;
        };
        await ctxWithReply.reply?.(
          'Произошла внутренняя ошибка. Попробуйте позже.',
        );
      }
    } catch {
      // ignore reply failures
    }
  }
}

export default errorMiddleware;
