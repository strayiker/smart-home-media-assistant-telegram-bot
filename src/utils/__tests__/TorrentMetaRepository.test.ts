import type { EntityManager } from '@mikro-orm/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TorrentMeta } from '../../entities/TorrentMeta.js';
import {
  type ITorrentMetaRepository,
  TorrentMetaRepository,
} from '../TorrentMetaRepository.js';

describe('TorrentMetaRepository', () => {
  let repository: ITorrentMetaRepository;
  let mockEm: EntityManager;
  let mockMeta: TorrentMeta;

  beforeEach(() => {
    mockEm = {
      create: vi.fn(),
      persistAndFlush: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      nativeDelete: vi.fn(),
    } as unknown as EntityManager;

    repository = new TorrentMetaRepository(mockEm);

    mockMeta = {
      id: 1,
      hash: 'abc123',
      uid: 'test-engine_12345',
      chatId: 12_345,
      searchEngine: 'test-engine',
      trackerId: '12345',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    } as TorrentMeta;
  });

  describe('create', () => {
    it('should create and persist TorrentMeta with timestamps', async () => {
      const input = {
        hash: 'abc123',
        uid: 'test-engine_12345',
        chatId: 12_345,
        searchEngine: 'test-engine',
        trackerId: '12345',
      };

      vi.mocked(mockEm.create).mockReturnValue(mockMeta);
      vi.mocked(mockEm.persistAndFlush).mockResolvedValue();

      const result = await repository.create(input);

      expect(mockEm.create).toHaveBeenCalledWith(
        TorrentMeta,
        expect.objectContaining({
          ...input,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(mockMeta);
      expect(result).toBe(mockMeta);
    });
  });

  describe('getByUid', () => {
    it('should return TorrentMeta by uid', async () => {
      vi.mocked(mockEm.findOne).mockResolvedValue(mockMeta);

      const result = await repository.getByUid('test-engine_12345');

      expect(mockEm.findOne).toHaveBeenCalledWith(TorrentMeta, {
        uid: 'test-engine_12345',
      });
      expect(result).toBe(mockMeta);
    });

    it('should return null when not found', async () => {
      vi.mocked(mockEm.findOne).mockResolvedValue(null);

      const result = await repository.getByUid('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getByHash', () => {
    it('should return TorrentMeta by hash', async () => {
      vi.mocked(mockEm.findOne).mockResolvedValue(mockMeta);

      const result = await repository.getByHash('abc123');

      expect(mockEm.findOne).toHaveBeenCalledWith(TorrentMeta, {
        hash: 'abc123',
      });
      expect(result).toBe(mockMeta);
    });

    it('should return null when not found', async () => {
      vi.mocked(mockEm.findOne).mockResolvedValue(null);

      const result = await repository.getByHash('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getByHashes', () => {
    it('should return TorrentMetas by hashes', async () => {
      const hashes = ['hash1', 'hash2'];
      const metas = [mockMeta, { ...mockMeta, hash: 'hash2' } as TorrentMeta];
      vi.mocked(mockEm.find).mockResolvedValue(metas);

      const result = await repository.getByHashes(hashes);

      expect(mockEm.find).toHaveBeenCalledWith(TorrentMeta, {
        hash: { $in: hashes },
      });
      expect(result).toEqual(metas);
    });

    it('should return empty array when hashes array is empty', async () => {
      const result = await repository.getByHashes([]);

      expect(result).toEqual([]);
      expect(mockEm.find).not.toHaveBeenCalled();
    });
  });

  describe('getByChatId', () => {
    it('should return TorrentMetas by chatId ordered by createdAt DESC', async () => {
      const chatId = 12_345;
      const metas = [mockMeta];
      vi.mocked(mockEm.find).mockResolvedValue(metas);

      const result = await repository.getByChatId(chatId);

      expect(mockEm.find).toHaveBeenCalledWith(
        TorrentMeta,
        { chatId },
        { orderBy: { createdAt: 'DESC' } },
      );
      expect(result).toEqual(metas);
    });
  });

  describe('removeByHash', () => {
    it('should remove TorrentMeta by hash', async () => {
      vi.mocked(mockEm.nativeDelete).mockResolvedValue(1);

      await repository.removeByHash('abc123');

      expect(mockEm.nativeDelete).toHaveBeenCalledWith(TorrentMeta, {
        hash: 'abc123',
      });
    });
  });

  describe('removeByUid', () => {
    it('should remove TorrentMeta by uid', async () => {
      vi.mocked(mockEm.nativeDelete).mockResolvedValue(1);

      await repository.removeByUid('test-engine_12345');

      expect(mockEm.nativeDelete).toHaveBeenCalledWith(TorrentMeta, {
        uid: 'test-engine_12345',
      });
    });
  });
});
