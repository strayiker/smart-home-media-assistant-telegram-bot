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
      this.createOrUpdateTorrentsMessages();
    }, 5 * 1000);

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

    try {
      await ctx.reply(text, {
        parse_mode: 'HTML',
      });
    } catch {
      return ctx.reply(ctx.t('search-torrents-unknown-error'));
    }
  }

  private async handleDownloadCommand(ctx: Filter<C, 'message::bot_command'>) {
    if (!ctx.message.text) {
      return;
    }

    const uid = ctx.message.text.replace('/dl_', '');
    const [seName, id] = uid.split('_');

    const se = this.searchEngines.find((se) => se.name === seName);

    if (!se) {
      return ctx.reply(ctx.t('torrent-unsupported-tracker-error'));
    }

    let torrent: string | undefined;

    try {
      torrent = await se.downloadTorrentFile(id);
    } catch {
      return ctx.reply(ctx.t('torrent-download-error'));
    }

    const { hash, error } = await this.addTorrent({
      torrent,
      tags: [
        `uid_${uid}`,
        `i18n_${ctx.chatId}_${ctx.from.language_code ?? 'en'}`,
      ],
    });

    if (!hash || error) {
      return ctx.reply(ctx.t('torrent-download-error'));
    }

    this.logger.debug('A new torrent where successfully added: %s', hash);

    const chatTorrents = this.chatTorrents.get(ctx.chatId);

    if (chatTorrents) {
      chatTorrents.push(hash);
    } else {
      this.chatTorrents.set(ctx.chatId, [hash]);
    }

    await this.createOrUpdateTorrentsMessage(ctx.chatId, true);
  }

  private async handleRemoveCommand(ctx: Filter<C, 'message::bot_command'>) {
    if (!ctx.message.text) {
      return;
    }
    const uid = ctx.message.text.replace('/rm_', '');

    const { torrent, error } = await this.getTorrentByUid(uid);

    if (!torrent || error) {
      return ctx.reply(ctx.t('torrent-remove-error'));
    }

    const { hash } = torrent;
    const { error: deletingError } = await this.deleteTorrent(hash);

    if (deletingError) {
      return ctx.reply(ctx.t('torrent-remove-error'));
    }

    this.logger.debug('A torrent where successfully deleted: %s', hash);

    await this.createOrUpdateTorrentsMessage(ctx.chatId, true);
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

  private async sendTorrentsMessage(chatId: number, text: string) {
    try {
      const message = await this.bot.api.sendMessage(chatId, text, {
        parse_mode: 'HTML',
      });
      message.text = text;
      this.chatMessages.set(chatId, message);
    } catch (error) {
      this.logger.error(
        error,
        'An error occured while sending torrents message',
      );
    }
  }

  private async updateTorrentsMessage(message: Message, text: string) {
    if (message.text === text) {
      return;
    }

    try {
      await this.bot.api.editMessageText(
        message.chat.id,
        message.message_id,
        text,
        {
          parse_mode: 'HTML',
        },
      );
      message.text = text;
    } catch (error) {
      if (
        error instanceof GrammyError &&
        error.description === 'Bad Request: message to edit not found'
      ) {
        await this.sendTorrentsMessage(message.chat.id, text);
      } else {
        this.logger.error(
          error,
          'An error occured while updating torrents message',
        );
      }
    }
  }

  private async deleteTorrentsMessage(message: Message) {
    try {
      await this.bot.api.deleteMessage(message.chat.id, message.message_id);
    } catch (error) {
      this.logger.error(
        error,
        'An error occured while deleting torrent message',
      );
    } finally {
      this.chatMessages.delete(message.chat.id);
    }
  }

  private async createOrUpdateTorrentsMessage(
    chatId: number,
    refresh: boolean = false,
  ) {
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

    if (message && (completed.length > 0 || pending.length === 0 || refresh)) {
      await this.deleteTorrentsMessage(message);
      message = undefined;
    }

    if (pending.length > 0) {
      const hashes = pending.map((torrent) => torrent.hash);
      this.chatTorrents.set(chatId, hashes);
    } else {
      this.chatTorrents.delete(chatId);
    }

    if (completed.length > 0) {
      try {
        const completedText = completed
          .map((torrent) => this.formatTorrent(chatId, torrent))
          .join('\n\n\n');
        await this.bot.api.sendMessage(chatId, completedText, {
          parse_mode: 'HTML',
        });
      } catch (error) {
        this.logger.error(
          error,
          'An error occured while sending completed torrents message',
          error,
        );
      }
    }

    if (pending.length === 0) {
      return;
    }

    const pendingText = pending
      .map((torrent) => this.formatTorrent(chatId, torrent))
      .join('\n\n\n');

    await (message
      ? this.updateTorrentsMessage(message, pendingText)
      : this.sendTorrentsMessage(chatId, pendingText));
  }

  private async createOrUpdateTorrentsMessages() {
    for (const chatId of this.chatTorrents.keys()) {
      this.createOrUpdateTorrentsMessage(chatId);
    }
  }

  private formatSearchResult(ctx: C, se: SearchEngine, result: SearchResult) {
    const lines = [];

    const uid = `${se.name}_${result.id}`;
    const title = `<b>${result.title}</b>`;
    const download = ctx.t('search-torrents-result-download', {
      link: `/dl_${uid}`,
    });

    const info: string[] = [];

    if (typeof result.totalSize === 'number') {
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
      const date = result.date.toLocaleDateString(
        ctx.from?.language_code ?? 'en',
      );
      info.push(date);
    }

    lines.push(title);
    lines.push('---');
    lines.push(info.join('  |  '));
    lines.push('---');
    lines.push(download);

    return lines.join('\n');
  }

  private formatTorrent(chatId: number, torrent: QBTorrent) {
    const lines = [];

    let uid: string | undefined;
    let locale: string = 'en';

    const prefixUid = 'uid_';
    const prefixI18n = `i18n_${chatId}_`;
    const completed = torrent.progress === 1;

    for (const tag of torrent.tags) {
      if (tag.startsWith(prefixUid)) {
        uid = tag.replace(prefixUid, '');
      } else if (tag.startsWith(prefixI18n)) {
        locale = tag.replace(prefixI18n, '');
      }
    }

    const t = fluent.withLocale(locale);

    lines.push(`<b>${torrent.name}</b>`);
    lines.push('---');

    if (!completed) {
      const seedAndPeers = t('torrent-message-seeds-peers', {
        seeds: `${torrent.num_seeds} (${torrent.num_complete})`,
        peers: `${torrent.num_leechs} (${torrent.num_incomplete})`,
      });
      const speed = t('torrent-message-speed', {
        speed: formatBytes(torrent.dlspeed),
      });
      const eta = t('torrent-message-eta', {
        eta:
          torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta, locale),
      });

      lines.push(seedAndPeers);
      lines.push(speed);
      lines.push(eta);
    }

    const progress = t('torrent-message-progress', {
      progress: `${Math.round(torrent.progress * 100 * 100) / 100}%`,
    });

    lines.push(progress);
    lines.push('---');

    if (uid) {
      const remove = t('torrent-message-remove', {
        link: `/rm_${uid}`,
      });
      lines.push(remove);
    }

    return lines.join('\n');
  }
}
