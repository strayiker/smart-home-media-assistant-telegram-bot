import fs from 'node:fs';
import path from 'node:path';

import type { EntityManager } from '@mikro-orm/core';
import { fileTypeFromFile, type FileTypeResult } from 'file-type';
import ffmpeg, { type FfprobeData } from 'fluent-ffmpeg';
import {
  type Bot,
  Composer,
  type Filter,
  GrammyError,
  InlineKeyboard,
} from 'grammy';
import { InputFile, type Message } from 'grammy/types';
import { tmpNameSync } from 'tmp';

import type { MyContext } from '../Context.js';
import type { TorrentMeta } from '../entities/TorrentMeta.js';
import { fluent } from '../fluent.js';
import type { QBFile, QBTorrent } from '../qBittorrent/models.js';
import type { QBittorrentClient } from '../qBittorrent/QBittorrentClient.js';
import type {
  SearchEngine,
  SearchResult,
} from '../searchEngines/SearchEngine.js';
import { ChatSettingsRepository } from '../utils/ChatSettingsRepository.js';
import { formatBytes } from '../utils/formatBytes.js';
import { formatDuration } from '../utils/formatDuration.js';
import type { Logger } from '../utils/Logger.js';
import { TorrentMetaRepository } from '../utils/TorrentMetaRepository.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const MAX_FILE_SIZE_KB = 2 * 1000 * 1000;
const PER_PAGE = 5;
const MAX_VIDEO_BITRATE = [
  [360, 1200],
  [480, 1800],
  [720, 2400],
  [1080, 4800],
  [1440, 7000],
  [2160, 9600],
] as const;

function isVideo(type?: FileTypeResult) {
  if (!type) {
    return false;
  }
  return ['mp4', 'mkv', 'avi'].includes(type.ext);
}

export interface TorrentComposerOptions {
  bot: Bot<MyContext>;
  dataPath: string;
  searchEngines: SearchEngine[];
  qBittorrent: QBittorrentClient;
  logger: Logger;
  em: EntityManager;
}

export class TorrentsComposer extends Composer<MyContext> {
  private bot: Bot<MyContext>;
  private dataPath: string;
  private searchEngines: SearchEngine[];
  private qBittorrent: QBittorrentClient;
  private chatMessages = new Map<number, Message>();
  private chatTorrents = new Map<number, Set<string>>();
  private timeout: NodeJS.Timeout;
  private logger: Logger;
  private torrentMetaRepository: TorrentMetaRepository;
  private chatSettingsRepository: ChatSettingsRepository;

  constructor(options: TorrentComposerOptions) {
    super();

    this.bot = options.bot;
    this.dataPath = options.dataPath;
    this.searchEngines = options.searchEngines;
    this.qBittorrent = options.qBittorrent;
    this.logger = options.logger;
    this.torrentMetaRepository = new TorrentMetaRepository(options.em);
    this.chatSettingsRepository = new ChatSettingsRepository(options.em);

    this.timeout = setInterval(() => {
      this.createOrUpdateTorrentsMessages();
    }, 5 * 1000);

    this.on('message::bot_command', async (ctx, next) => {
      if (ctx.message.text?.startsWith('/dl_file_')) {
        await this.handleDownloadFileCommand(ctx);
      } else if (ctx.message.text?.startsWith('/dl_')) {
        await this.handleDownloadCommand(ctx);
      } else if (ctx.message.text?.startsWith('/torrents')) {
        await this.handleTorrentsListCommand(ctx);
      } else if (ctx.message.text?.startsWith('/rm_')) {
        await this.handleRemoveCommand(ctx);
      } else if (ctx.message.text?.startsWith('/ls_')) {
        await this.handleListFilesCommand(ctx);
      } else {
        return next();
      }
    });

    this.on('callback_query:data', async (ctx, next) => {
      const data = ctx.callbackQuery.data;
      if (!data.startsWith('torrents:')) {
        return next();
      }

      const parsed = this.parseTorrentsCallback(data);

      if (!parsed || ctx.chatId === undefined) {
        await ctx.answerCallbackQuery();
        return;
      }

      const locale = await this.chatSettingsRepository.getLocale(ctx.chatId);
      const t = fluent.withLocale(locale);

      switch (parsed.action) {
        case 'page':
        case 'refresh': {
          try {
            const { text, keyboard } = await this.buildTorrentsList(
              ctx.chatId,
              parsed.page,
            );
            await ctx.editMessageText(text, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
          } catch (error) {
            this.logger.error(error, 'Failed to refresh torrents list');
            await ctx.editMessageText(t('torrents-list-error'));
          }
          await ctx.answerCallbackQuery();
          return;
        }
        case 'files': {
          await ctx.answerCallbackQuery();
          await this.sendTorrentFilesByUid(ctx, parsed.uid);
          return;
        }
        case 'remove': {
          try {
            await this.removeTorrentByUid(parsed.uid);
            await ctx.answerCallbackQuery({
              text: t('torrents-removed-success'),
            });
          } catch (error) {
            this.logger.error(error, 'Failed to remove torrent');
            await ctx.answerCallbackQuery({
              text: t('torrents-removed-error'),
              show_alert: false,
            });
          }

          try {
            const { text, keyboard } = await this.buildTorrentsList(
              ctx.chatId,
              parsed.page,
            );
            await ctx.editMessageText(text, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
          } catch (error) {
            this.logger.error(error, 'Failed to update torrents list');
          }
          return;
        }
        default: {
          await ctx.answerCallbackQuery();
          return;
        }
      }
    });

    this.on('message:text', async (ctx) => {
      return this.handleSearchQuery(ctx);
    });
  }

  async dispose() {
    clearInterval(this.timeout);
  }

  private async handleSearchQuery(ctx: Filter<MyContext, 'message:text'>) {
    const query = ctx.message.text;

    let results: (readonly [SearchEngine, SearchResult])[];

    try {
      results = await this.searchTorrents(query);
    } catch {
      return ctx.reply(ctx.t('search-unknown-error'));
    }

    if (results.length === 0) {
      return ctx.reply(ctx.t('search-empty-results'));
    }

    // TODO: Add button to load more results
    const text = results
      .slice(0, 5)
      .map(([se, result]) => this.formatSearchResult(ctx, se, result))
      .join('\n');

    try {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        link_preview_options: {
          is_disabled: true,
        },
      });
    } catch (error) {
      this.logger.error(error, 'An error occured whire sending search results');
    }
  }

  private async handleDownloadCommand(
    ctx: Filter<MyContext, 'message::bot_command'>,
  ) {
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

    let hash: string;

    try {
      hash = await this.addTorrent(torrent);
    } catch {
      return ctx.reply(ctx.t('torrent-download-error'));
    }

    try {
      await this.torrentMetaRepository.create({
        hash,
        uid,
        chatId: ctx.chatId,
        searchEngine: se.name,
        trackerId: id,
      });
    } catch (error) {
      this.logger.error(error, 'Failed to persist torrent metadata');
      try {
        await this.deleteTorrent(hash);
      } catch (deleteError) {
        this.logger.error(deleteError, 'Failed to rollback torrent creation');
      }
      return ctx.reply(ctx.t('torrent-download-error'));
    }

    this.logger.debug('A new torrent where successfully added: %s', hash);

    const chatTorrents = this.chatTorrents.get(ctx.chatId);

    if (chatTorrents) {
      chatTorrents.add(hash);
    } else {
      this.chatTorrents.set(ctx.chatId, new Set([hash]));
    }

    await this.createOrUpdateTorrentsMessage(ctx.chatId, true);
  }

  private async handleRemoveCommand(
    ctx: Filter<MyContext, 'message::bot_command'>,
  ) {
    if (!ctx.message.text) {
      return;
    }

    const uid = ctx.message.text.replace('/rm_', '');

    let hash: string;

    try {
      hash = await this.removeTorrentByUid(uid);
    } catch {
      return ctx.reply(ctx.t('torrent-remove-error'));
    }

    this.logger.debug('A torrent where successfully deleted: %s', hash);

    await this.createOrUpdateTorrentsMessage(ctx.chatId, true);
  }

  private async handleListFilesCommand(
    ctx: Filter<MyContext, 'message::bot_command'>,
  ) {
    if (!ctx.message.text) {
      return;
    }

    const uid = ctx.message.text.replace('/ls_', '');

    await this.sendTorrentFilesByUid(ctx, uid);
  }

  private async handleTorrentsListCommand(
    ctx: Filter<MyContext, 'message::bot_command'>,
  ) {
    if (ctx.chatId === undefined) {
      return;
    }

    try {
      const { text, keyboard } = await this.buildTorrentsList(ctx.chatId, 1);
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error(error, 'Failed to build torrents list');
      await ctx.reply(ctx.t('torrents-list-error'));
    }
  }

  private async handleDownloadFileCommand(
    ctx: Filter<MyContext, 'message::bot_command'>,
  ) {
    if (!ctx.message.text) {
      return;
    }

    const [trackerName, id, fileIndex] = ctx.message.text
      .replace('/dl_file_', '')
      .split('_');
    const uid = `${trackerName}_${id}`;

    let hash: string;

    try {
      ({ hash } = await this.getTorrentByUid(uid));
    } catch (error) {
      console.log(error);
      return ctx.reply(ctx.t('torrent-file-error'));
    }

    let qbFile: QBFile;

    try {
      [qbFile] = await this.getTorrentFiles(hash, [Number(fileIndex)]);
    } catch (error) {
      console.log(error);
      return ctx.reply(ctx.t('torrent-file-error'));
    }

    if (!qbFile) {
      return ctx.reply(ctx.t('torrent-file-empty'));
    }

    const filePath = path.resolve(path.join(this.dataPath, qbFile.name));
    const fileType = await fileTypeFromFile(filePath);

    if (!fileType) {
      return;
    }

    try {
      const file = new InputFile(filePath);

      if (isVideo(fileType)) {
        const metadata = await new Promise<FfprobeData>((resolve) => {
          ffmpeg.ffprobe(filePath, function (err, metadata) {
            if (err) {
              throw err;
            }
            resolve(metadata);
          });
        });

        const duration = metadata.format.duration;

        if (!duration) {
          return await ctx.reply(ctx.t('torrent-file-error'));
        }

        const videoStream = metadata.streams.find((stream) => {
          return stream.codec_type === 'video';
        });
        const videoStreamHeight = videoStream?.height;
        const videoStreamWidth = videoStream?.width;

        const videoOptions: Parameters<typeof ctx.replyWithVideo>[1] = {
          caption: path.basename(qbFile.name),
          duration,
        };

        if (videoStreamHeight !== undefined) {
          videoOptions.height = videoStreamHeight;
        }
        if (videoStreamWidth !== undefined) {
          videoOptions.width = videoStreamWidth;
        }

        if (qbFile.size <= MAX_FILE_SIZE) {
          await ctx.reply(ctx.t('torrent-file-uploading'));
          await ctx.replyWithVideo(file, videoOptions);
        } else {
          const aBitrate = 192;
          const vMaxBitrate = MAX_VIDEO_BITRATE.find(
            ([height]) => height > (videoStreamHeight ?? Infinity),
          )?.[1];
          const vBitrate = Math.min(
            Math.floor((MAX_FILE_SIZE_KB * 8) / duration - aBitrate),
            vMaxBitrate ?? Infinity,
          );

          this.logger.debug('Duration: %s', duration);
          this.logger.debug('Video bitrate: %s', vBitrate);
          this.logger.debug('Audio bitrate: %s', aBitrate);

          const tmpFile = tmpNameSync({ postfix: '.mp4' });

          ffmpeg(filePath)
            .outputOptions('-c:a', 'libfdk_aac')
            .outputOptions('-c:v', 'libx264')
            .outputOptions('-b:a', `${aBitrate}k`)
            .outputOptions('-b:v', `${vBitrate}k`)
            .outputOptions('-pix_fmt', 'yuv420p')
            .outputOptions('-movflags', 'faststart')
            .outputOptions('-tag:v', 'avc1')
            .outputOptions('-map', '0:v:0')
            .outputOptions('-map', '0:a:0')
            .outputOptions('-preset', 'fast')
            .outputFormat('mp4')
            .on('start', (cmd) => {
              this.logger.debug(cmd);
            })
            .on('progress', async (progress) => {
              const text = ctx.t('torrent-file-compressing', {
                progress: Math.round(progress.percent || 0),
              });
              if (text !== progressMessage.text) {
                try {
                  await this.bot.api.editMessageText(
                    progressMessage.chat.id,
                    progressMessage.message_id,
                    text,
                  );
                  progressMessage.text = text;
                } catch {
                  /* empty */
                }
              }
            })
            .on('end', async () => {
              try {
                await this.bot.api.editMessageText(
                  progressMessage.chat.id,
                  progressMessage.message_id,
                  ctx.t('torrent-file-uploading'),
                );
                await ctx.replyWithVideo(new InputFile(tmpFile), videoOptions);
              } catch (error) {
                this.logger.error(error, 'An error occured while sending file');
              } finally {
                fs.rmSync(tmpFile, {
                  force: true,
                });
              }
            })
            .on('error', (error) => {
              this.logger.error(error, 'An error occured while sending file');
              fs.rmSync(tmpFile, {
                force: true,
              });
            })
            .saveToFile(tmpFile);

          const progressMessage = await ctx.reply(
            ctx.t('torrent-file-compressing', { progress: 0 }),
          );
        }
      } else {
        if (qbFile.size <= MAX_FILE_SIZE) {
          ctx.replyWithDocument(file);
        } else {
          await ctx.reply(ctx.t('torrent-file-too-big'));
        }
      }
    } catch (error) {
      this.logger.error(error, 'An error occured while sending file');
    }
  }

  private async sendTorrentFilesByUid(ctx: MyContext, uid: string) {
    let hash: string;

    try {
      ({ hash } = await this.getTorrentByUid(uid));
    } catch (error) {
      this.logger.error(error, 'Failed to resolve torrent uid');
      return ctx.reply(ctx.t('torrent-files-error'));
    }

    let files: QBFile[];

    try {
      files = await this.getTorrentFiles(hash);
    } catch (error) {
      this.logger.error(error, 'Failed to get torrent files');
      return ctx.reply(ctx.t('torrent-files-error'));
    }

    if (files.length === 0) {
      return ctx.reply(ctx.t('torrent-files-empty'));
    }

    const texts = await Promise.all(
      files.map((file) => this.formatTorrentFile(ctx, uid, file)),
    );
    const text = texts.join('\n');

    try {
      await ctx.reply(text, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.error(error, 'An error occured while sending torrent files');
    }
  }

  private async removeTorrentByUid(uid: string) {
    const { hash } = await this.getTorrentByUid(uid);
    await this.deleteTorrent(hash);
    return hash;
  }

  private parseTorrentsCallback(data: string) {
    const parts = data.split(':');
    if (parts.length < 3 || parts[0] !== 'torrents') {
      return;
    }

    const action = parts[1];

    if (action === 'page' || action === 'refresh') {
      const page = Number(parts[2]);
      if (Number.isNaN(page)) {
        return;
      }
      return { action, page } as const;
    }

    if (action === 'files' || action === 'remove') {
      const uid = parts[2];
      const page = Number(parts[3] ?? '1');
      if (!uid || Number.isNaN(page)) {
        return;
      }
      return { action, page, uid } as const;
    }

    return;
  }

  private async buildTorrentsList(chatId: number, page: number) {
    const locale = await this.chatSettingsRepository.getLocale(chatId);
    const t = fluent.withLocale(locale);

    const metas = await this.torrentMetaRepository.getByChatId(chatId);

    if (metas.length === 0) {
      const keyboard = new InlineKeyboard().text(
        t('torrents-btn-refresh'),
        'torrents:refresh:1',
      );
      return {
        text: `${t('torrents-list-empty')}\n${t('torrents-list-empty-hint')}`,
        keyboard,
      };
    }

    const totalPages = Math.max(1, Math.ceil(metas.length / PER_PAGE));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const pageMetas = metas.slice(
      (safePage - 1) * PER_PAGE,
      safePage * PER_PAGE,
    );

    const hashes = pageMetas.map((meta) => meta.hash);
    const torrents: QBTorrent[] = await this.getTorrents(hashes);
    const torrentByHash = new Map<string, QBTorrent>(
      torrents.map((torrent) => [torrent.hash, torrent] as const),
    );

    const items: string[] = [];
    const keyboard = new InlineKeyboard();

    for (const meta of pageMetas) {
      const torrent = torrentByHash.get(meta.hash);
      if (!torrent) {
        continue;
      }

      const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;
      const eta =
        torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta, locale);

      if (torrent.progress < 1) {
        items.push(
          t('torrents-item-downloading', {
            title: torrent.name,
            progress,
            speed: `${formatBytes(torrent.dlspeed)}/s`,
            eta,
          }),
        );
        keyboard
          .text(
            t('torrents-btn-remove'),
            `torrents:remove:${meta.uid}:${safePage}`,
          )
          .row();
      } else {
        items.push(
          t('torrents-item-completed', {
            title: torrent.name,
            progress,
            size: formatBytes(torrent.size),
          }),
        );
        keyboard
          .text(
            t('torrents-btn-files'),
            `torrents:files:${meta.uid}:${safePage}`,
          )
          .text(
            t('torrents-btn-remove'),
            `torrents:remove:${meta.uid}:${safePage}`,
          )
          .row();
      }
    }

    if (items.length === 0) {
      const emptyKeyboard = new InlineKeyboard().text(
        t('torrents-btn-refresh'),
        `torrents:refresh:${safePage}`,
      );
      return {
        text: `${t('torrents-list-empty')}\n${t('torrents-list-empty-hint')}`,
        keyboard: emptyKeyboard,
      };
    }

    if (totalPages > 1) {
      if (safePage > 1) {
        keyboard.text(t('torrents-btn-prev'), `torrents:page:${safePage - 1}`);
      }
      keyboard.text(t('torrents-btn-refresh'), `torrents:refresh:${safePage}`);
      if (safePage < totalPages) {
        keyboard.text(t('torrents-btn-next'), `torrents:page:${safePage + 1}`);
      }
      keyboard.row();
    } else {
      keyboard.text(t('torrents-btn-refresh'), `torrents:refresh:${safePage}`);
    }

    return {
      text: `${t('torrents-list-title', { page: safePage, totalPages })}\n\n${items.join('\n\n')}`,
      keyboard,
    };
  }

  private async searchTorrents(query: string) {
    try {
      const promises = this.searchEngines.map(async (se) => {
        const results = await se.search(query);
        return results.map((result) => [se, result] as const);
      });
      const results = await Promise.all(promises);
      return results.flat();
    } catch (error) {
      this.logger.error(error, 'An error occured while searching torrents');
      throw error;
    }
  }

  private async addTorrent(torrent: string) {
    try {
      const result = await this.qBittorrent.addTorrents({
        torrents: [torrent],
      });

      if (result.ok) {
        const [hash] = result.value;
        return hash;
      }

      throw result.error ?? new Error('Failed to add torrent');
    } catch (error) {
      this.logger.error(error, 'An error occured while adding new torrent');
      throw error;
    }
  }

  private async getTorrents(hashes: string[]): Promise<QBTorrent[]> {
    try {
      return this.qBittorrent.getTorrents({ hashes });
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
      throw error;
    }
  }

  private async getTorrentByUid(uid: string) {
    try {
      const meta = await this.torrentMetaRepository.getByUid(uid);
      if (!meta) {
        throw new Error(`Torrent metadata not found for uid: ${uid}`);
      }
      return meta;
    } catch (error) {
      this.logger.error(
        error,
        'An error occured while fetching torrent metadata',
      );
      throw error;
    }
  }

  private async getTorrentFiles(hash: string, indexes?: number[]) {
    try {
      return await this.qBittorrent.getTorrentFiles(hash, indexes);
    } catch (error) {
      this.logger.error(
        error,
        'An error occured while retrieving torrent files',
      );
      throw error;
    }
  }

  private async deleteTorrent(hash: string) {
    try {
      await this.qBittorrent.deleteTorrents([hash], true);
      await this.torrentMetaRepository.removeByHash(hash);
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
      throw error;
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
    const hashMap = this.chatTorrents.get(chatId);

    if (!hashMap || hashMap.size === 0) {
      this.chatMessages.delete(chatId);
      this.chatTorrents.delete(chatId);
      return;
    }

    let torrents: QBTorrent[];

    try {
      torrents = await this.getTorrents([...hashMap.values()]);
    } catch {
      return;
    }

    const completedTorrents: QBTorrent[] = [];
    const pendingTorrents: QBTorrent[] = [];

    let metaByHash = new Map<string, TorrentMeta>();
    try {
      const metas = await this.torrentMetaRepository.getByHashes(
        torrents.map((torrent) => torrent.hash),
      );
      metaByHash = new Map(metas.map((meta) => [meta.hash, meta]));
    } catch (error) {
      this.logger.error(
        error,
        'An error occured while fetching torrent metadata',
      );
    }

    for (const torrent of torrents) {
      if (torrent.progress < 1) {
        pendingTorrents.push(torrent);
      } else {
        completedTorrents.push(torrent);
      }
    }

    const locale = await this.chatSettingsRepository.getLocale(chatId);
    let message = this.chatMessages.get(chatId);

    if (
      message &&
      (completedTorrents.length > 0 || pendingTorrents.length === 0 || refresh)
    ) {
      await this.deleteTorrentsMessage(message);
      message = undefined;
    }

    if (completedTorrents.length > 0) {
      const text = completedTorrents
        .map((torrent) =>
          this.formatTorrent(torrent, metaByHash.get(torrent.hash), locale),
        )
        .join('\n');

      try {
        await this.bot.api.sendMessage(chatId, text, {
          parse_mode: 'HTML',
        });
      } catch (error) {
        this.logger.error(
          error,
          'An error occured while sending completed torrents message',
        );
      }
    }

    if (pendingTorrents.length > 0) {
      const hashes = pendingTorrents.map((torrent) => torrent.hash);
      this.chatTorrents.set(chatId, new Set(hashes));

      const text = pendingTorrents
        .map((torrent) =>
          this.formatTorrent(torrent, metaByHash.get(torrent.hash), locale),
        )
        .join('\n');

      await (message
        ? this.updateTorrentsMessage(message, text)
        : this.sendTorrentsMessage(chatId, text));
    } else {
      this.chatTorrents.delete(chatId);
    }
  }

  private async createOrUpdateTorrentsMessages() {
    for (const chatId of this.chatTorrents.keys()) {
      this.createOrUpdateTorrentsMessage(chatId);
    }
  }

  private formatSearchResult(
    ctx: MyContext,
    se: SearchEngine,
    result: SearchResult,
  ) {
    const uid = `${se.name}_${result.id}`;
    const size = formatBytes(result.size ?? 0);
    const download = `/dl_${uid}`;
    const tags = [
      ...result.tags.map((tag) => `[${tag}]`),
      `<a href="${result.detailsUrl}">[${se.name}]</a>`,
    ].join(' ');

    return ctx.t('search-message', {
      title: result.title,
      tags,
      size,
      seeds: result.seeds ?? 0,
      peers: result.peers ?? 0,
      publishDate: result.publishDate ?? '---',
      download,
    });
  }

  private formatTorrent(
    torrent: QBTorrent,
    meta: TorrentMeta | undefined,
    locale: string,
  ) {
    const uid = meta?.uid;
    const speed = `${formatBytes(torrent.dlspeed)}/s`;
    const eta =
      torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta, locale);
    const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;
    const files = uid ? `/ls_${uid}` : '—';
    const remove = uid ? `/rm_${uid}` : '—';

    const t = fluent.withLocale(locale);

    return torrent.progress < 1
      ? t('torrent-message-in-progress', {
          title: torrent.name,
          seeds: torrent.num_seeds,
          maxSeeds: torrent.num_complete,
          peers: torrent.num_leechs,
          maxPeers: torrent.num_incomplete,
          speed,
          eta,
          progress,
          remove,
        })
      : t('torrent-message-completed', {
          title: torrent.name,
          progress,
          files,
          remove,
        });
  }

  private async formatTorrentFile(
    ctx: MyContext,
    torrentUid: string,
    file: QBFile,
  ) {
    const filePath = path.resolve(path.join(this.dataPath, file.name));
    const fileType = await fileTypeFromFile(filePath);

    let size = formatBytes(file.size ?? 0);
    let download = `/dl_file_${torrentUid}_${file.index}`;

    if (file.size > MAX_FILE_SIZE) {
      if (isVideo(fileType)) {
        size += ` (${ctx.t('torrent-file-will-be-compressed')})`;
      } else {
        download = ctx.t('torrent-file-too-big');
      }
    }

    return ctx.t('torrent-file-message', {
      name: file.name,
      size,
      download,
    });
  }
}
