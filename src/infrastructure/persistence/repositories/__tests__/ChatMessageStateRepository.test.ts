import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MikroORM } from '@mikro-orm/better-sqlite';
import type { EntityManager } from '@mikro-orm/core';

import type { ChatMessageState } from '../../domain/entities/ChatMessageState.js';
import { ChatMessageStateRepository } from '../ChatMessageStateRepository.js';

describe('ChatMessageStateRepository', () => {
  let repository: ChatMessageStateRepository;
  let mockEm: EntityManager;

  beforeEach(() => {
    // Create a mock EntityManager
    mockEm = {
      create: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      persistAndFlush: vi.fn(),
      removeAndFlush: vi.fn(),
    } as unknown as EntityManager;
    repository = new ChatMessageStateRepository(mockEm);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveMessageState', () => {
    it('should save a new message state', async () => {
      const input = {
        chatId: 123,
        messageType: 'torrent_progress' as const,
        messageId: 456,
        data: { uids: ['uid1', 'uid2'] },
        expiresAt: new Date('2026-01-25T00:00:00Z'),
      };

      const mockState = { id: 1, ...input };
      vi.mocked(mockEm.findOne).mockResolvedValue(null);
      vi.mocked(mockEm.create).mockReturnValue(mockState);
      vi.mocked(mockEm.persistAndFlush).mockResolvedValue(undefined);

      const result = await repository.saveMessageState(input);

      expect(mockEm.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(mockEm.create).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(mockState);
      expect(result).toEqual(mockState);
    });

    it('should update an existing message state', async () => {
      const existing = {
        id: 1,
        chatId: 123,
        messageType: 'torrent_progress' as const,
        messageId: 456,
        data: { uids: ['old_uid'] },
        expiresAt: new Date('2026-01-25T00:00:00Z'),
        createdAt: new Date('2026-01-20T00:00:00Z'),
        updatedAt: new Date('2026-01-20T00:00:00Z'),
      };

      const input = {
        chatId: 123,
        messageType: 'torrent_progress' as const,
        messageId: 789,
        data: { uids: ['new_uid'] },
        expiresAt: new Date('2026-01-26T00:00:00Z'),
      };

      vi.mocked(mockEm.findOne).mockResolvedValue(existing);
      vi.mocked(mockEm.persistAndFlush).mockResolvedValue(undefined);

      const result = await repository.saveMessageState(input);

      expect(mockEm.findOne).toHaveBeenCalled();
      expect(existing.messageId).toBe(789);
      expect(existing.data).toEqual({ uids: ['new_uid'] });
      expect(existing.expiresAt).toEqual(input.expiresAt);
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(existing);
      expect(result).toEqual(existing);
    });
  });

  describe('getMessageState', () => {
    it('should return message state if found', async () => {
      const mockState = {
        id: 1,
        chatId: 123,
        messageType: 'torrent_progress' as const,
        messageId: 456,
      };

      vi.mocked(mockEm.findOne).mockResolvedValue(mockState);

      const result = await repository.getMessageState(123, 'torrent_progress');

      expect(mockEm.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockState);
    });

    it('should return null if not found', async () => {
      vi.mocked(mockEm.findOne).mockResolvedValue(null);

      const result = await repository.getMessageState(999, 'torrent_progress');

      expect(mockEm.findOne).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('getAllActiveTorrentProgressMessages', () => {
    it('should return all torrent progress messages ordered by chatId', async () => {
      const mockStates = [
        {
          id: 1,
          chatId: 100,
          messageType: 'torrent_progress' as const,
          messageId: 1001,
        },
        {
          id: 2,
          chatId: 200,
          messageType: 'torrent_progress' as const,
          messageId: 2002,
        },
        {
          id: 3,
          chatId: 150,
          messageType: 'torrent_progress' as const,
          messageId: 1501,
        },
      ];

      vi.mocked(mockEm.find).mockResolvedValue(mockStates);

      const result = await repository.getAllActiveTorrentProgressMessages();

      expect(mockEm.find).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        mockStates[1], // chatId 150
        mockStates[0], // chatId 100
        mockStates[1], // chatId 200
      ]);
    });

    it('should return empty array if no messages found', async () => {
      vi.mocked(mockEm.find).mockResolvedValue([]);

      const result = await repository.getAllActiveTorrentProgressMessages();

      expect(mockEm.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('deleteMessageState', () => {
    it('should delete message state if found', async () => {
      const mockState = {
        id: 1,
        chatId: 123,
        messageType: 'torrent_progress' as const,
        messageId: 456,
      };

      vi.mocked(mockEm.findOne).mockResolvedValue(mockState);
      vi.mocked(mockEm.removeAndFlush).mockResolvedValue(undefined);

      const result = await repository.deleteMessageState(123, 'torrent_progress');

      expect(mockEm.findOne).toHaveBeenCalled();
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockState);
      expect(result).toBe(true);
    });

    it('should return false if not found', async () => {
      vi.mocked(mockEm.findOne).mockResolvedValue(null);

      const result = await repository.deleteMessageState(999, 'torrent_progress');

      expect(mockEm.findOne).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredMessages', () => {
    it('should delete expired messages', async () => {
      const now = new Date('2026-01-23T00:00:00Z');
      const expiredStates = [
        {
          id: 1,
          chatId: 100,
          messageType: 'torrent_progress' as const,
          messageId: 1001,
          expiresAt: new Date('2026-01-22T00:00:00Z'), // Expired
        },
        {
          id: 2,
          chatId: 200,
          messageType: 'torrent_progress' as const,
          messageId: 2002,
          expiresAt: new Date('2026-01-21T00:00:00Z'), // Expired
        },
      ];

      vi.mocked(mockEm.find).mockResolvedValue(expiredStates);
      vi.mocked(mockEm.removeAndFlush).mockResolvedValue(undefined);

      const result = await repository.cleanupExpiredMessages(now);

      expect(mockEm.find).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(expiredStates);
      expect(result).toBe(2);
    });

    it('should use current time if beforeDate not provided', async () => {
      const expiredStates = [
        {
          id: 1,
          chatId: 100,
          messageType: 'torrent_progress' as const,
          messageId: 1001,
          expiresAt: new Date('2026-01-22T00:00:00Z'), // Expired
        },
      ];

      vi.mocked(mockEm.find).mockResolvedValue(expiredStates);
      vi.mocked(mockEm.removeAndFlush).mockResolvedValue(undefined);

      vi.useFakeTimers();
      const fixedDate = new Date('2026-01-23T12:00:00Z');
      vi.setSystemTime(fixedDate);

      const result = await repository.cleanupExpiredMessages();

      expect(mockEm.find).toHaveBeenCalled();
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(expiredStates);
      expect(result).toBe(1);

      vi.useRealTimers();
    });

    it('should return 0 if no expired messages', async () => {
      vi.mocked(mockEm.find).mockResolvedValue([]);

      const result = await repository.cleanupExpiredMessages();

      expect(mockEm.find).toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });

  describe('deleteAllMessagesForChat', () => {
    it('should delete all messages for a chat', async () => {
      const mockStates = [
        {
          id: 1,
          chatId: 123,
          messageType: 'torrent_progress' as const,
          messageId: 1001,
        },
        {
          id: 2,
          chatId: 123,
          messageType: 'torrent_progress' as const,
          messageId: 1002,
        },
      ];

      vi.mocked(mockEm.find).mockResolvedValue(mockStates);
      vi.mocked(mockEm.removeAndFlush).mockResolvedValue(undefined);

      const result = await repository.deleteAllMessagesForChat(123);

      expect(mockEm.find).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockStates);
      expect(result).toBe(2);
    });

    it('should return 0 if no messages for chat', async () => {
      vi.mocked(mockEm.find).mockResolvedValue([]);

      const result = await repository.deleteAllMessagesForChat(999);

      expect(mockEm.find).toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
