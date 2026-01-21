import { Composer, type Filter, type NextFunction } from 'grammy';

import type { MyContext } from '../shared/context.js';
import type { AuthService } from '../domain/services/AuthService.js';

export class AuthComposer extends Composer<MyContext> {
  constructor(private authService: AuthService) {
    super();

    this.use(this.checkAuth.bind(this));

    this.on('message:text', (ctx, next) => {
      if (ctx.session.awaitingSecret) {
        return this.handleSecret(ctx);
      }
      return next();
    });
  }

  private async checkAuth(ctx: MyContext, next: NextFunction) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    const existing = await this.authService.ensureUser(telegramId);
    if (existing) {
      ctx.session.awaitingSecret = false;
      return next();
    }

    if (ctx.session.awaitingSecret) {
      return next();
    }

    await ctx.reply(ctx.t('auth-enter-secret'));
    ctx.session.awaitingSecret = true;
  }

  private async handleSecret(ctx: Filter<MyContext, 'message:text'>) {
    const text = ctx.message?.text?.trim() ?? '';
    const fromId = ctx.from?.id;

    if (!fromId) {
      await ctx.reply(ctx.t('auth-fail'));
      return;
    }

    const ok = await this.authService.validateSecret(fromId, text);
    if (ok) {
      ctx.session.awaitingSecret = false;
      await ctx.reply(ctx.t('auth-success'));
    } else {
      await ctx.reply(ctx.t('auth-fail'));
    }
  }
}
