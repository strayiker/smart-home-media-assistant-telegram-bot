import { type NextFunction } from 'grammy';
import { logger } from '../../../logger.js';

export async function errorMiddleware(ctx: any, next: NextFunction) {
  try {
    await next();
  } catch (error) {
    try {
      logger.error(error, 'Handler error');
    } catch (_) {
      // ignore logging failures
    }

    try {
      if (ctx && typeof ctx.reply === 'function') {
        await ctx.reply('Произошла внутренняя ошибка. Попробуйте позже.');
      }
    } catch (_) {
      // ignore reply failures
    }
  }
}

export default errorMiddleware;
