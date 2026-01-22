import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * Message type enum for different chat messages
 */
export type MessageType =
  | 'torrent_progress'
  | 'torrents_list'
  | 'file_list'
  | 'search_result'
  | 'other';

/**
 * ChatMessageState entity stores tracking information for bot messages
 * to enable state restoration after bot restarts.
 *
 * Features:
 * - Tracks message IDs for different types of messages
 * - Stores optional JSON data (e.g., torrent UIDs, pagination info)
 * - Supports TTL via expiresAt for automatic cleanup
 * - Enables recovery of in-memory state (chatMessages, chatTorrents)
 */
@Entity({ tableName: 'chat_message_state' })
export class ChatMessageState {
  @PrimaryKey()
  id!: number;

  @Property({ name: 'chat_id' })
  @Index()
  chatId!: number;

  @Property({ name: 'message_type' })
  @Index()
  messageType!: MessageType;

  @Property({ name: 'message_id' })
  @Index()
  messageId!: number;

  /**
   * JSON data for additional context (e.g., torrent UIDs, page number)
   * Example: { uids: ['seName_id1', 'seName_id2'], page: 1 }
   */
  @Property({ type: 'json', name: 'data', nullable: true })
  data?: Record<string, unknown>;

  /**
   * Expiration time for automatic cleanup of stale message references.
   * Defaults to 24 hours after creation.
   */
  @Property({ name: 'expires_at', nullable: true })
  @Index()
  expiresAt?: Date;

  @Property({ name: 'created_at', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ name: 'updated_at', onUpdate: () => new Date() })
  updatedAt!: Date;
}
