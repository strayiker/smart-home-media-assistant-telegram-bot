export type SessionData = Record<string, unknown>;

export interface ChatSessionService {
  get(chatId: number): Promise<SessionData | undefined>;
  set(chatId: number, data: SessionData): Promise<void>;
  delete(chatId: number): Promise<void>;
  clear(): Promise<void>;
}

// Keep only named exports for types
