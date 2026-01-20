import type { ChatSessionService, SessionData } from '../../domain/services/ChatSessionService.js';

export type SimpleDbAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
};

// SQLiteSessionStore accepts an injected adapter implementing SimpleDbAdapter.
// If no adapter is provided, it falls back to an in-memory Map.
export class SQLiteSessionStore implements ChatSessionService {
  private adapter: SimpleDbAdapter | undefined;
  private map: Map<number, SessionData> | null = null;
  private prefix: string;

  constructor(adapter?: SimpleDbAdapter, prefix = 'session:') {
    this.adapter = adapter;
    this.prefix = prefix;
    if (!adapter) {
      this.map = new Map();
    }
  }

  private key(chatId: number) {
    return `${this.prefix}${chatId}`;
  }

  async get(chatId: number): Promise<SessionData | null> {
    if (this.adapter) {
      const raw = await this.adapter.get(this.key(chatId));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SessionData;
      } catch (_) {
        return null;
      }
    }

    return this.map!.get(chatId) ?? null;
  }

  async set(chatId: number, data: SessionData): Promise<void> {
    if (this.adapter) {
      await this.adapter.set(this.key(chatId), JSON.stringify(data));
      return;
    }
    this.map!.set(chatId, data);
  }

  async delete(chatId: number): Promise<void> {
    if (this.adapter) {
      await this.adapter.del(this.key(chatId));
      return;
    }
    this.map!.delete(chatId);
  }

  async clear(): Promise<void> {
    if (this.adapter) {
      // adapter may not support range delete; no-op
      return;
    }
    this.map!.clear();
  }
}

export default SQLiteSessionStore;
