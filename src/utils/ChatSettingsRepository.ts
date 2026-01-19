import type { EntityManager } from '@mikro-orm/core';

import { ChatSettings } from '../entities/ChatSettings.js';

const DEFAULT_LOCALE = 'en';

const normalizeLocale = (locale: string) => {
  const normalized = locale.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_LOCALE;
  }
  return normalized.split('-')[0] ?? DEFAULT_LOCALE;
};

export class ChatSettingsRepository {
  constructor(private em: EntityManager) {}

  async upsertLocale(chatId: number, locale: string) {
    const normalizedLocale = normalizeLocale(locale);
    const existing = await this.em.findOne(ChatSettings, { chatId });

    if (existing) {
      if (existing.locale !== normalizedLocale) {
        existing.locale = normalizedLocale;
        existing.updatedAt = new Date();
        await this.em.persistAndFlush(existing);
      }
      return existing;
    }

    const now = new Date();
    const settings = this.em.create(ChatSettings, {
      chatId,
      locale: normalizedLocale,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.persistAndFlush(settings);
    return settings;
  }

  async getLocale(chatId: number) {
    const settings = await this.em.findOne(ChatSettings, { chatId });
    return settings?.locale ?? DEFAULT_LOCALE;
  }
}
