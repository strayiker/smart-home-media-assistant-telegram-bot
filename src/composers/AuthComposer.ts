import { type EntityManager } from '@mikro-orm/core';
import { Composer, type Filter, type NextFunction } from 'grammy';

import type { MyContext } from '../Context.js'; // Ваш расширенный контекст с сессией и EntityManager
import { User } from '../entities/User.js';

export class AuthComposer extends Composer<MyContext> {
  constructor(
    private em: EntityManager,
    private secretKey: string,
  ) {
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
    if (!telegramId) return;

    const existing = await this.em.findOne(User, { telegramId });
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
    const text = ctx.message.text.trim();

    if (text === this.secretKey) {
      const user = new User();
      user.telegramId = ctx.from.id;
      await this.em.persistAndFlush(user);
      ctx.session.awaitingSecret = false;
      await ctx.reply(ctx.t('auth-success'));
    } else {
      await ctx.reply(ctx.t('auth-fail'));
    }
  }
}
