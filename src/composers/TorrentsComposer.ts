import { type FluentContextFlavor } from '@grammyjs/fluent';
import {
  type Bot,
  Composer,
  type Context,
  type Filter,
  GrammyError,
} from 'grammy';
import { type Message } from 'grammy/types';

import { fluent } from '../fluent.js';
import { type QBTorrent } from '../qBittorrent/models.js';
import { type QBittorrentClient } from '../qBittorrent/QBittorrentClient.js';
import {
  type SearchEngine,
  type SearchResult,
} from '../searchEngines/SearchEngine.js';
import { formatBytes } from '../utils/formatBytes.js';
import { formatDuration } from '../utils/formatDuration.js';
import { type Logger } from '../utils/Logger.js';

export interface TorrentComposerOptions<C extends Context> {
  bot: Bot<C>;
  searchEngines: SearchEngine[];
  qBittorrent: QBittorrentClient;
  logger: Logger;
}

export class TorrentsComposer<
  C extends Context & FluentContextFlavor,
> extends Composer<C> {
  private bot: Bot<C>;
  private searchEngines: SearchEngine[];
  private qBittorrent: QBittorrentClient;
  private chatMessages = new Map<number, Message>();
  private chatTorrents = new Map<number, string[]>();
  private timeout: NodeJS.Timeout;
  private logger: Logger;

  constructor(options: TorrentComposerOptions<C>) {
    super();

    this.bot = options.bot;
    this.searchEngines = options.searchEngines;
    this.qBittorrent = options.qBittorrent;
    this.logger = options.logger;

    this.timeout = setInterval(() => {
      this.createOrUpdateCardMessages();
    }, 10 * 1000);

    this.on('message::bot_command', async (ctx, next) => {
      if (ctx.message.text?.startsWith('/dl_')) {
        await this.handleDownloadCommand(ctx);
      } else if (ctx.message.text?.startsWith('/rm_')) {
        await this.handleRemoveCommand(ctx);
      } else {
        return next();
      }
    });

    this.on('message:text', async (ctx) => {
      return this.handleSearchQuery(ctx);
    });
  }

  async dispose() {
    clearInterval(this.timeout);
  }

  private async handleSearchQuery(ctx: Filter<C, 'message:text'>) {
    const query = ctx.message.text;

    const { results, error } = await this.searchTorrents(query);

    if (!results || error) {
      return ctx.reply(ctx.t('search-torrents-unknown-error'));
    }

    if (results.length === 0) {
      return ctx.reply(ctx.t('search-torrents-empty'));
    }

    // TODO: Add buttons to navigate between pages
    const text = results
      .slice(0, 5)
      .map(([se, result]) => this.formatSearchResult(ctx, se, result))
      .join('\n\n\n');

    return ctx.reply(text, {
      parse_mode: 'HTML',
    });
  }

  private async handleDownloadCommand(ctx: Filter<C, 'message::bot_command'>) {
    if (!ctx.message.text) {
      return;
    }

    const uid = ctx.message.text.replace('/dl_', '');
    const [seName, id] = uid.split('_');

    const se = this.searchEngines.find((se) => se.name === seName);

    if (!se) {
      return ctx.reply(ctx.t('download-torrent-tracker-not-supported-error'));
    }

    let torrent: string | undefined;

    try {
      torrent = await se.downloadTorrentFile(id);
    } catch {
      return ctx.reply(ctx.t('download-torrent-unknown-error'));
    }

    const { hash, error } = await this.addTorrent({
      torrent,
      tags: [
        `uid_${uid}`,
        `i18n_${ctx.chatId}_${ctx.from.language_code ?? 'en'}`,
      ],
    });

    if (!hash || error) {
      return ctx.reply(ctx.t('download-torrent-unknown-error'));
    }

    this.logger.debug('A new torrent where successfully added: %s', hash);

    const chatTorrents = this.chatTorrents.get(ctx.chatId);

    if (chatTorrents) {
      chatTorrents.push(hash);
    } else {
      this.chatTorrents.set(ctx.chatId, [hash]);
    }

    await this.createOrUpdateCardMessage(ctx.chatId);
  }

  private async handleRemoveCommand(ctx: Filter<C, 'message::bot_command'>) {
    if (!ctx.message.text) {
      return;
    }
    const uid = ctx.message.text.replace('/rm_', '');

    const { torrent, error } = await this.getTorrentByUid(uid);

    if (!torrent || error) {
      return ctx.reply(ctx.t('remove-torrent-unknown-error'));
    }

    const { hash } = torrent;
    const { error: deletingError } = await this.deleteTorrent(hash);

    if (deletingError) {
      return ctx.reply(ctx.t('remove-torrent-unknown-error'));
    }

    this.logger.debug('A torrent where successfully deleted: %s', hash);

    await this.createOrUpdateCardMessage(ctx.chatId);
  }

  private async searchTorrents(query: string) {
    try {
      const promises = this.searchEngines.map(async (se) => {
        const results = await se.search(query);
        return results.map((result) => [se, result] as const);
      });

      const results = await Promise.all(promises);

      return { results: results.flat() };
    } catch (error) {
      this.logger.error(error, 'An error occured while searching torrents');
      return { error };
    }
  }

  private async addTorrent({
    torrent,
    tags,
  }: {
    torrent: string;
    tags: string[];
  }) {
    try {
      const [hash] = await this.qBittorrent.addTorrents({
        torrents: [torrent],
        tags,
      });
      return { hash };
    } catch (error) {
      this.logger.error(error, 'An error occured while adding new torrent');
      return { error };
    }
  }

  private async getTorrents(hashes: string[]) {
    try {
      const torrents = await this.qBittorrent.getTorrents({ hashes });
      return { torrents };
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
      return { error };
    }
  }

  private async getTorrentByUid(uid: string) {
    try {
      const [torrent] = await this.qBittorrent.getTorrents({
        tag: `uid_${uid}`,
      });
      return { torrent };
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
      return { error };
    }
  }

  private async deleteTorrent(hash: string) {
    try {
      await this.qBittorrent.deleteTorrents([hash], true);
      return {};
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
      return { error };
    }
  }

  private async sendCardMessage(chatId: number, cardText: string) {
    try {
      const message = await this.bot.api.sendMessage(chatId, cardText, {
        parse_mode: 'HTML',
      });
      message.text = cardText;
      this.chatMessages.set(chatId, message);
    } catch (error) {
      this.logger.error(error, 'An error occured while sending card message');
    }
  }

  private async updateCardMessage(message: Message, cardText: string) {
    if (message.text === cardText) {
      return;
    }

    try {
      await this.bot.api.editMessageText(
        message.chat.id,
        message.message_id,
        cardText,
        {
          parse_mode: 'HTML',
        },
      );
      message.text = cardText;
    } catch (error) {
      if (
        error instanceof GrammyError &&
        error.description === 'Bad Request: message to edit not found'
      ) {
        await this.sendCardMessage(message.chat.id, cardText);
      } else {
        this.logger.error(
          error,
          'An error occured while updating card message',
        );
      }
    }
  }

  private async deleteCardMessage(message: Message) {
    try {
      await this.bot.api.deleteMessage(message.chat.id, message.message_id);
    } catch (error) {
      this.logger.error(error, 'An error occured while deleting card message');
    } finally {
      this.chatMessages.delete(message.chat.id);
    }
  }

  private async createOrUpdateCardMessage(chatId: number) {
    const hashes = this.chatTorrents.get(chatId);

    if (!hashes || hashes.length === 0) {
      this.chatMessages.delete(chatId);
      this.chatTorrents.delete(chatId);
      return;
    }

    const { torrents, error } = await this.getTorrents(hashes);

    if (!torrents || error) {
      return;
    }

    const pending: QBTorrent[] = [];
    const completed: QBTorrent[] = [];

    for (const torrent of torrents) {
      if (torrent.progress < 1) {
        pending.push(torrent);
      } else {
        completed.push(torrent);
      }
    }

    let message = this.chatMessages.get(chatId);

    if (message && (completed.length > 0 || pending.length === 0)) {
      await this.deleteCardMessage(message);
      message = undefined;
    }

    if (pending.length > 0) {
      const hashes = pending.map((torrent) => torrent.hash);
      this.chatTorrents.set(chatId, hashes);
    } else {
      this.chatTorrents.delete(chatId);
    }

    for await (const torrent of completed) {
      try {
        const text = this.formatTorrent(chatId, torrent);
        await this.bot.api.sendMessage(chatId, text, {
          parse_mode: 'HTML',
        });
      } catch (error) {
        this.logger.error(
          error,
          'An error occured while sending card message',
          error,
        );
      }
    }

    if (pending.length === 0) {
      return;
    }

    const cardText = pending
      .map((torrent) => this.formatTorrent(chatId, torrent))
      .join('\n\n\n');

    await (message
      ? this.updateCardMessage(message, cardText)
      : this.sendCardMessage(chatId, cardText));
  }

  private async createOrUpdateCardMessages() {
    for (const chatId of this.chatTorrents.keys()) {
      this.createOrUpdateCardMessage(chatId);
    }
  }

  private formatSearchResult(ctx: C, se: SearchEngine, result: SearchResult) {
    const uid = `${se.name}_${result.id}`;
    const lines = [`<b>${result.title}</b>`, '---'];
    const info: string[] = [];

    if (result.totalSize) {
      info.push(formatBytes(result.totalSize));
    }

    if (
      typeof result.seeds === 'number' ||
      typeof result.leeches === 'number'
    ) {
      const seeds = `${result.seeds ?? 0}`;
      const peers = `${result.leeches ?? 0}`;
      info.push(`${seeds}/${peers}`);
    }

    if (result.date) {
      info.push(
        result.date.toLocaleDateString(ctx.from?.language_code ?? 'en'),
      );
    }

    lines.push(info.join('  |  '));
    lines.push('---');
    lines.push(
      ctx.t('search-torrents-result-download-link', { link: `/dl_${uid}` }),
    );

    return lines.join('\n');
  }

  private formatTorrent(chatId: number, torrent: QBTorrent) {
    let uid: string | undefined;
    let locale: string = 'en';

    for (const tag of torrent.tags) {
      if (tag.startsWith('uid_')) {
        uid = tag.replace('uid_', '');
      } else if (tag.startsWith(`i18n_${chatId}_`)) {
        locale = tag.replace(`i18n_${chatId}_`, '');
      }
    }

    const t = fluent.withLocale(locale);

    const lines = [`<b>${torrent.name}</b>`, '---'];

    if (torrent.progress < 1) {
      const seeds = `${torrent.num_seeds} (${torrent.num_complete})`;
      const peers = `${torrent.num_leechs} (${torrent.num_incomplete})`;
      const eta =
        torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta, locale);

      lines.push(t('download-torrent-card-seeds-peers', { seeds, peers }));
      lines.push(
        t('download-torrent-card-speed', {
          speed: formatBytes(torrent.dlspeed),
        }),
      );
      lines.push(t('download-torrent-card-eta', { eta }));
    }

    const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;

    lines.push(t('download-torrent-card-progress', { progress }));
    lines.push('---');

    if (uid) {
      lines.push(
        t('download-torrent-card-remove-link', { link: `/rm_${uid}` }),
      );
    }

    return lines.join('\n');
  }
}
