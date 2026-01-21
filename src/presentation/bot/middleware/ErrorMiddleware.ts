import { type NextFunction } from 'grammy';

import type { MyContext } from '../../../Context.js';
import { AppError } from '../../../domain/errors/AppError.js';
import { logger } from '../../../logger.js';

/**
 * Error handling middleware for Grammy bot.
 * Catches all errors, logs them with structured format,
 * and sends localized error messages to users.
 */
export async function errorMiddleware(ctx: MyContext, next: NextFunction) {
  try {
    await next();
  } catch (error) {
    // Log all errors with structured format
    if (error instanceof AppError) {
      logger.warn(
        {
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
          userId: ctx.from?.id,
          chatId: ctx.chatId,
        },
        error.message,
      );
    } else {
      // Unknown/unexpected errors
      logger.error(
        {
          error: error as unknown,
          userId: ctx.from?.id,
          chatId: ctx.chatId,
        },
        'Unhandled error in middleware',
      );
    }

    // Send localized error message to user
    try {
      if (error instanceof AppError) {
        // Translate error code to localized message
        const errorKey = `error-${error.code.toLowerCase()}`;
        await ctx.reply(ctx.t(errorKey));
      } else {
        // Generic error message for unknown errors
        await ctx.reply(ctx.t('error-unknown'));
      }
    } catch (replyError) {
      // Ignore reply failures (user may have blocked the bot)
      logger.warn(replyError, 'Failed to send error reply');
    }
  }
}

export default errorMiddleware;
