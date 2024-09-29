import {
  type Bot,
  Composer,
  type Context,
  type Filter,
  GrammyError,
} from 'grammy';
import { type Message } from 'grammy/types';

import { type QBTorrent } from '../qBittorrent/models.js';
import { type QBittorrentClient } from '../qBittorrent/QBittorrentClient.js';
import {
  type SearchEngine,
  type SearchResult,
} from '../searchEngines/SearchEngine.js';
import { formatBytes } from '../utils/formatBytes.js';
import { formatDuration } from '../utils/formatDuration.js';
import { type Logger } from '../utils/Logger.js';

export interface TorrentComposerOptions {
  bot: Bot;
  searchEngines: SearchEngine[];
  qBittorrent: QBittorrentClient;
  logger: Logger;
}

export class TorrentsComposer<C extends Context> extends Composer<C> {
  private bot: Bot;
  private searchEngines: SearchEngine[];
  private qBittorrent: QBittorrentClient;
  private chatMessages = new Map<number, Message>();
  private chatTorrents = new Map<number, string[]>();
  private timeout: NodeJS.Timeout;
  private logger: Logger;

  constructor(options: TorrentComposerOptions) {
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

  private async handleSearchQuery(ctx: Filter<Context, 'message:text'>) {
    const query = ctx.message.text;

    const { results, error } = await this.searchTorrents(query);

    if (!results || error) {
      return ctx.reply('Во время поиска произошла ошибка');
    }

    if (results.length === 0) {
      return ctx.reply('Нет результов');
    }

    const text = results
      .slice(0, 5)
      .map(([searchEngines, result]) =>
        this.formatSearchResult(searchEngines, result),
      )
      .join('\n\n\n');

    return ctx.reply(text, {
      parse_mode: 'HTML',
    });
  }

  private async handleDownloadCommand(
    ctx: Filter<Context, 'message::bot_command'>,
  ) {
    if (!ctx.message.text) {
      return;
    }
    const tag = ctx.message.text.replace('/dl_', '');
    const tagParts = tag.split('_');
    const searchEngineName = tagParts[0];
    const torrentId = tagParts[1];

    const searchEngine = this.searchEngines.find(
      (searchEngine) => searchEngine.name === searchEngineName,
    );

    if (!searchEngine) {
      return ctx.reply('Трекер не поддерживается');
    }

    let torrent: string | undefined;

    try {
      torrent = await searchEngine.downloadTorrentFile(torrentId);
    } catch {
      return ctx.reply('При добавлении торрента произошла ошибка');
    }

    const { hash, error } = await this.addTorrent({ torrent, tag });

    if (!hash || error) {
      return ctx.reply('При добавлении торрента произошла ошибка');
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

  private async handleRemoveCommand(
    ctx: Filter<Context, 'message::bot_command'>,
  ) {
    if (!ctx.message.text) {
      return;
    }
    const tag = ctx.message.text.replace('/rm_', '');

    const { torrent, error } = await this.getTorrentByTag(tag);

    if (!torrent || error) {
      return ctx.reply('При удалении торрента произошла ошибка');
    }

    const { hash } = torrent;
    const { error: deletingError } = await this.deleteTorrent(hash);

    if (deletingError) {
      return ctx.reply('При удалении торрента произошла ошибка');
    }

    this.logger.debug('A torrent where successfully deleted: %s', hash);

    await this.createOrUpdateCardMessage(ctx.chatId);
  }

  private async searchTorrents(query: string) {
    try {
      const promises = this.searchEngines.map(async (searchEngine) => {
        const results = await searchEngine.search(query);
        return results.map((result) => [searchEngine, result] as const);
      });

      const results = await Promise.all(promises);

      return { results: results.flat() };
    } catch (error) {
      this.logger.error(error, 'An error occured while searching torrents');
      return { error };
    }
  }

  private async addTorrent({ torrent, tag }: { torrent: string; tag: string }) {
    try {
      const [hash] = await this.qBittorrent.addTorrents({
        torrents: [torrent],
        tags: [tag],
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

  private async getTorrentByTag(tag: string) {
    try {
      const [torrent] = await this.qBittorrent.getTorrents({ tag });
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
        await this.bot.api.sendMessage(chatId, this.formatTorrent(torrent), {
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
      .map((torrent) => this.formatTorrent(torrent))
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

  private formatSearchResult(searchEngine: SearchEngine, result: SearchResult) {
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
      info.push(result.date.toLocaleDateString('ru'));
    }

    lines.push(info.join('  |  '), '---');

    const tag = `${searchEngine.name}_${result.id}`;
    lines.push(`Скачать: /dl_${tag}`);

    return lines.join('\n');
  }

  private formatTorrent(torrent: QBTorrent) {
    const lines = [`<b>${torrent.name}</b>`, '---'];

    if (torrent.progress < 1) {
      const seeds = `${torrent.num_seeds} (${torrent.num_complete})`;
      const peers = `${torrent.num_leechs} (${torrent.num_incomplete})`;
      const eta = torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta);
      const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;

      lines.push(`Сиды: ${seeds},  Личи: ${peers}`);
      lines.push(`Скорость: ${formatBytes(torrent.dlspeed)}/s`);
      lines.push(`Осталось: ${eta}`);
      lines.push(`Прогресс: ${progress}`);
    } else {
      lines.push(`Статус: Загружен`);
    }

    lines.push('---');

    const [tag] = torrent.tags;

    if (tag) {
      lines.push(`Удалить: /rm_${tag}`);
    }

    return lines.join('\n');
  }
}