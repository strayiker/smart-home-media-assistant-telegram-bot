import type { EntityManager } from '@mikro-orm/core';

import { User } from '../../../domain/entities/User.js';

export class UserRepository {
  private em: EntityManager;

  constructor(em: EntityManager) {
    this.em = em;
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return await this.em.findOne(User, { telegramId });
  }

  async create(telegramId: number): Promise<User> {
    const user = new User();
    user.telegramId = telegramId;
    await this.em.persistAndFlush(user);
    return user;
  }
}
