import type { EntityManager } from '@mikro-orm/core';

import { TorrentMeta } from '../entities/TorrentMeta.js';

export interface TorrentMetaCreateInput {
  hash: string;
  uid: string;
  chatId: number;
  searchEngine: string;
  trackerId: string;
}

export class TorrentMetaRepository {
  constructor(private em: EntityManager) {}

  async create(input: TorrentMetaCreateInput) {
    const now = new Date();
    const meta = this.em.create(TorrentMeta, {
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.persistAndFlush(meta);
    return meta;
  }

  async getByUid(uid: string) {
    return this.em.findOne(TorrentMeta, { uid });
  }

  async getByHash(hash: string) {
    return this.em.findOne(TorrentMeta, { hash });
  }

  async getByHashes(hashes: string[]) {
    if (hashes.length === 0) {
      return [] as TorrentMeta[];
    }
    // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
    return this.em.find(TorrentMeta, {
      hash: { $in: hashes },
    });
  }

  async getByChatId(chatId: number) {
    return this.em.find(
      TorrentMeta,
      { chatId },
      { orderBy: { createdAt: 'DESC' } },
    );
  }

  async removeByHash(hash: string) {
    await this.em.nativeDelete(TorrentMeta, { hash });
  }

  async removeByUid(uid: string) {
    await this.em.nativeDelete(TorrentMeta, { uid });
  }
}
