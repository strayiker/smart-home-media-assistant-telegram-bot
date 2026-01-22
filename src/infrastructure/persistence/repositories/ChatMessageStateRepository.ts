import type { EntityManager } from '@mikro-orm/core';

import type { MessageType } from '../../../domain/entities/ChatMessageState.js';
import { ChatMessageState } from '../../../domain/entities/ChatMessageState.js';

export interface ChatMessageStateCreateInput {
  chatId: number;
  messageType: MessageType;
  messageId: number;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface IChatMessageStateRepository {
  saveMessageState(
    input: ChatMessageStateCreateInput,
  ): Promise<ChatMessageState>;
  getMessageState(
    chatId: number,
    messageType: MessageType,
  ): Promise<ChatMessageState | null>;
  getAllActiveTorrentProgressMessages(): Promise<ChatMessageState[]>;
  deleteMessageState(
    chatId: number,
    messageType: MessageType,
  ): Promise<boolean>;
  cleanupExpiredMessages(beforeDate?: Date): Promise<number>;
  deleteAllMessagesForChat(chatId: number): Promise<number>;
}

/**
 * Repository for managing chat message state persistence.
 *
 * This repository handles CRUD operations for tracking bot messages
 * to enable state restoration after bot restarts.
 */
export class ChatMessageStateRepository implements IChatMessageStateRepository {
  constructor(private em: EntityManager) {}

  /**
   * Save or update a message state record.
   *
   * @param input - The message state data
   * @returns The saved/updated ChatMessageState entity
   */
  async saveMessageState(
    input: ChatMessageStateCreateInput,
  ): Promise<ChatMessageState> {
    const { chatId, messageType, messageId, data, expiresAt } = input;

    // Check if a record exists for this chat and message type
    const existing = await this.em.findOne(ChatMessageState, {
      chatId,
      messageType,
    });

    if (existing) {
      // Update existing record
      existing.messageId = messageId;
      if (data !== undefined) {
        existing.data = data;
      }
      if (expiresAt !== undefined) {
        existing.expiresAt = expiresAt;
      }
      await this.em.persistAndFlush(existing);
      return existing;
    }

    // Create new record
    const now = new Date();
    const createData = {
      chatId,
      messageType,
      messageId,
      createdAt: now,
      updatedAt: now,
      ...(data !== undefined && { data }),
      ...(expiresAt !== undefined && { expiresAt }),
    };

    const state = this.em.create(ChatMessageState, createData);
    await this.em.persistAndFlush(state);
    return state;
  }

  /**
   * Get the active message state for a specific chat and message type.
   *
   * @param chatId - The Telegram chat ID
   * @param messageType - The type of message
   * @returns The ChatMessageState or null if not found
   */
  async getMessageState(
    chatId: number,
    messageType: MessageType,
  ): Promise<ChatMessageState | null> {
    return this.em.findOne(ChatMessageState, { chatId, messageType });
  }

  /**
   * Get all active torrent progress messages across all chats.
   * Used for state restoration after bot restart.
   *
   * @returns Array of ChatMessageState records with message type 'torrent_progress'
   */
  async getAllActiveTorrentProgressMessages(): Promise<ChatMessageState[]> {
    const results = await this.em.find(
      ChatMessageState,
      { messageType: 'torrent_progress' as MessageType },
      { orderBy: { chatId: 'ASC' } },
    );

    // Ensure a stable ordering by chatId in case the underlying driver
    // returns unsorted results during tests or discovery.
    return [...results].sort((a, b) => (a.chatId ?? 0) - (b.chatId ?? 0));
  }

  /**
   * Delete a message state record for a specific chat and message type.
   *
   * @param chatId - The Telegram chat ID
   * @param messageType - The type of message
   * @returns True if a record was deleted, false otherwise
   */
  async deleteMessageState(
    chatId: number,
    messageType: MessageType,
  ): Promise<boolean> {
    const state = await this.em.findOne(ChatMessageState, {
      chatId,
      messageType,
    });
    if (!state) {
      return false;
    }
    await this.em.removeAndFlush(state);
    return true;
  }

  /**
   * Cleanup expired message state records.
   * Should be called periodically (e.g., every hour) to prevent accumulation.
   *
   * @param beforeDate - Optional cutoff date (defaults to current time)
   * @returns The number of deleted records
   */
  async cleanupExpiredMessages(beforeDate?: Date): Promise<number> {
    const cutoff = beforeDate || new Date();
    // eslint-disable-next-line unicorn/no-array-method-this-argument
    const expiredRecords = await this.em.find(ChatMessageState, {
      expiresAt: { $lte: cutoff },
    });
    const count = expiredRecords.length;

    if (count > 0) {
      await this.em.removeAndFlush(expiredRecords);
    }

    return count;
  }

  /**
   * Delete all message states for a specific chat.
   * Useful when a user leaves a chat or resets state.
   *
   * @param chatId - The Telegram chat ID
   * @returns The number of deleted records
   */
  async deleteAllMessagesForChat(chatId: number): Promise<number> {
    // eslint-disable-next-line unicorn/no-array-method-this-argument
    const states = await this.em.find(ChatMessageState, { chatId });
    const count = states.length;

    if (count > 0) {
      await this.em.removeAndFlush(states);
    }

    return count;
  }
}
