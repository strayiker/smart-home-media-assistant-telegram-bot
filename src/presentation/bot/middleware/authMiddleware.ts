import type { NextFunction } from 'grammy';
import type { MyContext } from '../../../shared/context.js';
import type { AuthService } from '../../../domain/services/AuthService.js';

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
    } catch (err) {
      // On error, allow request to continue but log via reply
      await ctx.reply(ctx.t('auth-fail'));
      return;
    }
  };
}
