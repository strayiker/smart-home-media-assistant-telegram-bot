import type { EntityManager } from '@mikro-orm/core';

import type { ChatSessionService, SessionData } from '../../domain/services/ChatSessionService.js';
import { ChatSession } from '../../entities/ChatSession.js';

export class DbSessionStore implements ChatSessionService {
  private em: EntityManager;

  constructor(em: EntityManager) {
    this.em = em;
  }

  private async findByChatId(chatId: number) {
    return this.em.findOne(ChatSession, { chatId: String(chatId) });
  }

  async get(chatId: number): Promise<SessionData | undefined> {
    const row = await this.findByChatId(chatId);
    if (!row) return undefined;
    try {
      return JSON.parse(row.data) as SessionData;
    } catch {
      return undefined;
    }
  }

  async set(chatId: number, data: SessionData): Promise<void> {
    const existing = await this.findByChatId(chatId);
    const payload = JSON.stringify(data);
    if (existing) {
      existing.data = payload;
      await this.em.flush();
      return;
    }
    const sess = new ChatSession();
    sess.chatId = String(chatId);
    sess.data = payload;
    await this.em.persistAndFlush(sess);
  }

  async delete(chatId: number): Promise<void> {
    const existing = await this.findByChatId(chatId);
    if (existing) {
      await this.em.removeAndFlush(existing);
    }
  }

  async clear(): Promise<void> {
    await this.em.nativeDelete(ChatSession, {});
  }
}

export default DbSessionStore;
