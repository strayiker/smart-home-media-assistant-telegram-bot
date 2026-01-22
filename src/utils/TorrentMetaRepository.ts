import type { EntityManager } from '@mikro-orm/core';

import { TorrentMeta } from '../entities/TorrentMeta.js';

export interface TorrentMetaCreateInput {
  hash: string;
  uid: string;
  chatId: number;
  searchEngine: string;
  trackerId: string;
}

export interface ITorrentMetaRepository {
  create(input: TorrentMetaCreateInput): Promise<TorrentMeta>;
  getByUid(uid: string): Promise<TorrentMeta | null>;
  getByHash(hash: string): Promise<TorrentMeta | null>;
  getByHashes(hashes: string[]): Promise<TorrentMeta[]>;
  getByChatId(chatId: number): Promise<TorrentMeta[]>;
  removeByHash(hash: string): Promise<void>;
  removeByUid(uid: string): Promise<void>;
}

export class TorrentMetaRepository implements ITorrentMetaRepository {
  constructor(private em: EntityManager) {}

  async create(input: TorrentMetaCreateInput): Promise<TorrentMeta> {
    const now = new Date();
    const meta = this.em.create(TorrentMeta, {
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.persistAndFlush(meta);
    return meta;
  }

  async getByUid(uid: string): Promise<TorrentMeta | null> {
    return this.em.findOne(TorrentMeta, { uid });
  }

  async getByHash(hash: string): Promise<TorrentMeta | null> {
    return this.em.findOne(TorrentMeta, { hash });
  }

  async getByHashes(hashes: string[]): Promise<TorrentMeta[]> {
    if (hashes.length === 0) {
      return [] as TorrentMeta[];
    }
    // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
    return this.em.find(TorrentMeta, {
      hash: { $in: hashes },
    });
  }

  async getByChatId(chatId: number): Promise<TorrentMeta[]> {
    return this.em.find(
      TorrentMeta,
      { chatId },
      { orderBy: { createdAt: 'DESC' } },
    );
  }

  async removeByHash(hash: string): Promise<void> {
    await this.em.nativeDelete(TorrentMeta, { hash });
  }

  async removeByUid(uid: string): Promise<void> {
    await this.em.nativeDelete(TorrentMeta, { uid });
  }
}
