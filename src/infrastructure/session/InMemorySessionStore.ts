import type { ChatSessionService, SessionData } from '../../domain/services/ChatSessionService.js';

export class InMemorySessionStore implements ChatSessionService {
  private store: Map<number, SessionData> = new Map();

  async get(chatId: number): Promise<SessionData | null> {
    return this.store.get(chatId) ?? null;
  }

  async set(chatId: number, data: SessionData): Promise<void> {
    this.store.set(chatId, data);
  }

  async delete(chatId: number): Promise<void> {
    this.store.delete(chatId);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export default InMemorySessionStore;
