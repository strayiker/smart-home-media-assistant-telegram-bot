import type { NextFunction } from 'grammy';

import type { AuthService } from '../../../domain/services/AuthService.js';
import type { MyContext } from '../../../shared/context.js';

export function createAuthMiddleware(authService: AuthService) {
  return async function authMiddleware(ctx: MyContext, next: NextFunction) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    try {
      const exists = await authService.isAuthorized(telegramId);
      if (exists) return next();

      if (ctx.session.awaitingSecret) {
        // user is in onboarding flow; validate secret
        const text = ctx.message?.text?.trim() ?? '';
        if (!text) return; // ignore non-text while awaiting

        const ok = await authService.validateSecret(telegramId, text);
        if (ok) {
          ctx.session.awaitingSecret = false;
          await ctx.reply(ctx.t('auth-success'));
        } else {
          await ctx.reply(ctx.t('auth-fail'));
        }
        return;
      }

      // prompt for secret
      await ctx.reply(ctx.t('auth-enter-secret'));
      ctx.session.awaitingSecret = true;
      return;
    } catch {
      // On error, allow request to continue but inform user
      await ctx.reply(ctx.t('auth-fail'));
      return;
    }
  };
}
