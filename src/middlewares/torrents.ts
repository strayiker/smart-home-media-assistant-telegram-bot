import { type Bot, Composer, type Context, GrammyError } from 'grammy';
import { type Message } from 'grammy/types';
import { customAlphabet } from 'nanoid';

import { type QBTorrent } from '../qBittorrent/models.js';
import { type QBittorrentClient } from '../qBittorrent/QBittorrentClient.js';
import { type Engine, type SearchResult } from '../torrents/Engine.js';
import { formatBytes } from '../utils/formatBytes.js';
import { formatDuration } from '../utils/formatDuration.js';
import { formatProgress } from '../utils/formatProgress.js';
import { type Logger } from '../utils/Logger.js';

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz',
  10,
);

export interface TorrentParams {
  bot: Bot;
  engines: Engine[];
  qBittorrent: QBittorrentClient;
  logger: Logger;
}

export class Torrents<C extends Context> extends Composer<C> {
  private bot: Bot;
  private engines: Engine[];
  private qBittorrent: QBittorrentClient;
  private chatMessages = new Map<number, Message>();
  private chatTorrents = new Map<number, string[]>();
  private searchResults = new Map<string, SearchResult>();
  private timeout: NodeJS.Timeout;
  private logger: Logger;

  constructor(params: TorrentParams) {
    super();

    this.bot = params.bot;
    this.engines = params.engines;
    this.qBittorrent = params.qBittorrent;
    this.logger = params.logger;

    this.timeout = setInterval(() => {
      this.createOrUpdateCardMessages();
    }, 10 * 1000);

    this.on('message:entities:bot_command', async (ctx, next) => {
      if (!ctx.message.text.startsWith('/dl_')) {
        return next();
      }

      const id = ctx.message.text.replace('/dl_', '');
      const searchResult = this.searchResults.get(id);

      if (!searchResult) {
        return ctx.reply(
          'Команда устарела. Воспользуйтесь поиском, чтобы получить актуальный список торрентов',
        );
      }

      const engine = this.engines.find(
        (engine) => engine.name === searchResult.engineName,
      );

      if (!engine) {
        return ctx.reply('Скачивание с этого трекера не поддерживается');
      }

      const metainfo = await engine.downloadTorrentFile(
        searchResult.downloadUrl,
      );

      const { hashes, error } = await this.addTorrent(metainfo);

      if (!hashes || hashes.length === 0 || error) {
        return ctx.reply(
          'При добавлении торрента в очередь на скачивание произошла ошибка',
        );
      }

      this.logger.debug('A new torrents where successfully added: %s', hashes);

      const chatTorrents = this.chatTorrents.get(ctx.chatId);

      if (chatTorrents) {
        chatTorrents.push(...hashes);
      } else {
        this.chatTorrents.set(ctx.chatId, hashes);
      }

      const message = this.chatMessages.get(ctx.chatId);

      if (message) {
        await ctx.deleteMessages([message.message_id]);
      }

      this.chatMessages.delete(ctx.chatId);

      this.createOrUpdateCardMessage(ctx.chatId);
    });

    this.on('message:text', async (ctx) => {
      const query = ctx.message.text;

      const { data, error } = await this.searchTorrents(query);

      if (!data || error) {
        return ctx.reply('Во время поиска произошла ошибка');
      }

      if (data.length === 0) {
        return ctx.reply('Нет результов');
      }

      const results: string[] = [];

      for (const [i, result] of data.entries()) {
        const id = nanoid();

        this.searchResults.set(id, result);

        if (i < 5) {
          results.push(this.formatSearchResult(id, result));
        }
      }

      return ctx.reply(results.join('\n\n'), {
        parse_mode: 'HTML',
      });
    });
  }

  async dispose() {
    clearInterval(this.timeout);
  }

  private async searchTorrents(query: string) {
    try {
      const promises = this.engines.map(async (engine) => {
        return engine.search(query);
      });

      const resultsList = await Promise.all(promises);
      const data = resultsList.flat();

      return { data };
    } catch (error) {
      this.logger.error(error, 'An error occured while searching torrents');
      return { error };
    }
  }

  private async addTorrent(torrent: string) {
    try {
      const hashes = await this.qBittorrent.addTorrents({
        torrents: [torrent],
      });
      return { hashes };
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
      .join('\n\n');

    await (message
      ? this.updateCardMessage(message, cardText)
      : this.sendCardMessage(chatId, cardText));
  }

  private async createOrUpdateCardMessages() {
    for (const chatId of this.chatTorrents.keys()) {
      this.createOrUpdateCardMessage(chatId);
    }
  }

  private formatSearchResult(id: string, result: SearchResult) {
    const lines = [`<b>${result.title}</b>`];

    lines.push('---');

    if (result.createdAt) {
      lines.push(`Дата: ${result.createdAt.toLocaleDateString('ru')}`);
    }

    if (result.totalSize) {
      lines.push(`Размер: ${formatBytes(result.totalSize)}`);
    }

    if (
      typeof result.seeds === 'number' ||
      typeof result.leeches === 'number'
    ) {
      lines.push(`Сиды/Пиры: ${result.seeds ?? 0} / ${result.leeches ?? 0}`);
    }

    lines.push(`Скачать: /dl_${id}`);
    lines.push('');

    return lines.join('\n');
  }

  private formatTorrent(torrent: QBTorrent) {
    const lines = [`<b>${torrent.name}</b>`];

    const eta = torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta);

    lines.push('---');
    lines.push(`Сиды: ${torrent.num_seeds} (${torrent.num_complete})`);
    lines.push(`Пиры: ${torrent.num_leechs} (${torrent.num_incomplete})`);
    lines.push(`Скорость: ${formatBytes(torrent.dlspeed)}/s`);
    lines.push(`Осталось: ${eta}`);
    lines.push(`<code>${formatProgress(torrent.progress)}</code>`);
    lines.push('');

    return lines.join('\n');
  }
}
