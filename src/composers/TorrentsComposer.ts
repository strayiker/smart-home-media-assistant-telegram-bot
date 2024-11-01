import path from 'node:path';

import { type FluentContextFlavor } from '@grammyjs/fluent';
import { fileTypeFromFile } from 'file-type';
import ffmpeg, { type FfprobeData } from 'fluent-ffmpeg';
import {
  type Bot,
  Composer,
  type Context,
  type Filter,
  GrammyError,
} from 'grammy';
import { InputFile, type Message } from 'grammy/types';
import { tmpNameSync } from 'tmp';

import { fluent } from '../fluent.js';
import { type QBFile, type QBTorrent } from '../qBittorrent/models.js';
import { type QBittorrentClient } from '../qBittorrent/QBittorrentClient.js';
import {
  type SearchEngine,
  type SearchResult,
} from '../searchEngines/SearchEngine.js';
import { formatBytes } from '../utils/formatBytes.js';
import { formatDuration } from '../utils/formatDuration.js';
import { type Logger } from '../utils/Logger.js';

const MAX_FILE_SIZE = 2_000_000; // 2 GB telegram limit

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
  private chatTorrents = new Map<number, Set<string>>();
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
      if (ctx.message.text?.startsWith('/dl_file_')) {
        await this.handleDownloadFileCommand(ctx);
      } else if (ctx.message.text?.startsWith('/dl_')) {
        await this.handleDownloadCommand(ctx);
      } else if (ctx.message.text?.startsWith('/rm_')) {
        await this.handleRemoveCommand(ctx);
      } else if (ctx.message.text?.startsWith('/ls_')) {
        await this.handleListFilesCommand(ctx);
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

    let results: (readonly [SearchEngine, SearchResult])[];

    try {
      results = await this.searchTorrents(query);
    } catch {
      return ctx.reply(ctx.t('search-unknown-error'));
    }

    if (results.length === 0) {
      return ctx.reply(ctx.t('search-empty-results'));
    }

    // TODO: Add buttons to navigate between pages
    const text = results
      .slice(0, 5)
      .map(([se, result]) => this.formatSearchResult(ctx, se, result))
      .join('\n\n');

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

    let hash: string;

    try {
      const uidTag = `uid_${uid}`;
      const i18nTag = `i18n_${ctx.chatId}_${ctx.from.language_code ?? 'en'}`;
      hash = await this.addTorrent({
        torrent,
        tags: [uidTag, i18nTag],
      });
    } catch {
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

  private async handleRemoveCommand(ctx: Filter<C, 'message::bot_command'>) {
    if (!ctx.message.text) {
      return;
    }

    const uid = ctx.message.text.replace('/rm_', '');

    let hash: string;

    try {
      ({ hash } = await this.getTorrentByUid(uid));
    } catch {
      return ctx.reply(ctx.t('torrent-remove-error'));
    }

    try {
      await this.deleteTorrent(hash);
    } catch {
      return ctx.reply(ctx.t('torrent-remove-error'));
    }

    this.logger.debug('A torrent where successfully deleted: %s', hash);

    await this.createOrUpdateTorrentsMessage(ctx.chatId, true);
  }

  private async handleListFilesCommand(ctx: Filter<C, 'message::bot_command'>) {
    if (!ctx.message.text) {
      return;
    }

    const uid = ctx.message.text.replace('/ls_', '');

    let hash: string;

    try {
      ({ hash } = await this.getTorrentByUid(uid));
    } catch (error) {
      console.log(error);
      return ctx.reply(ctx.t('torrent-files-error'));
    }

    let files: QBFile[];

    try {
      files = await this.getTorrentFiles(hash);
    } catch (error) {
      console.log(error);
      return ctx.reply(ctx.t('torrent-files-error'));
    }

    if (files.length === 0) {
      return ctx.reply(ctx.t('torrent-files-empty'));
    }

    const text = files
      .map((file) => this.formatTorrentFile(ctx, uid, file))
      .join('\n\n');

    try {
      await ctx.reply(text, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.error(error, 'An error occured while sending torrent files');
    }
  }

  private async handleDownloadFileCommand(
    ctx: Filter<C, 'message::bot_command'>,
  ) {
    if (!ctx.message.text) {
      return;
    }

    const [trackerName, id, fileIndex] = ctx.message.text
      .replace('/dl_file_', '')
      .split('_');
    const uid = `${trackerName}_${id}`;

    let hash: string;
    let save_path: string;

    try {
      ({ hash, save_path } = await this.getTorrentByUid(uid));
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

    const filePath = path.normalize(path.join(save_path, qbFile.name));
    const fileType = await fileTypeFromFile(filePath);

    this.logger.debug(fileType);

    if (!fileType) {
      return;
    }

    try {
      const file = new InputFile(filePath);

      if (['mp4', 'mkv', 'avi'].includes(fileType.ext)) {
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

        if (qbFile.size <= MAX_FILE_SIZE) {
          await ctx.reply(ctx.t('torrent-file-uploading'));
          await ctx.replyWithVideo(file, {
            duration,
            height: videoStream?.height,
            width: videoStream?.width,
          });
        } else {
          const size = MAX_FILE_SIZE;

          const aBitrate = 192;
          const vBitrate = Math.floor((size * 8) / duration - aBitrate);

          this.logger.debug('Duration: %s', duration);
          this.logger.debug('Video bitrate: %s', vBitrate);
          this.logger.debug('Audio bitrate: %s', aBitrate);

          const tmpFile = tmpNameSync({ postfix: '.mp4' });

          ffmpeg(filePath)
            .videoBitrate(vBitrate)
            .audioBitrate(aBitrate)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions('-map', '0:a:0')
            .outputOptions('-map', '0:v:0')
            .outputOptions('-pix_fmt', 'yuv420p')
            .outputOptions('-preset', 'fast')
            .outputFormat('mp4')
            .on('start', (cmd) => {
              this.logger.debug(cmd);
            })
            .on('progress', async (progress) => {
              const text = ctx.t('torrent-file-encoding', {
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
                await ctx.reply(ctx.t('torrent-file-uploading'));
                await ctx.replyWithVideo(new InputFile(tmpFile), {
                  duration,
                  height: videoStream?.height,
                  width: videoStream?.width,
                });
              } catch (error) {
                this.logger.error(error, 'An error occured while sending file');
              }
            })
            .saveToFile(tmpFile);

          const progressMessage = await ctx.reply(
            ctx.t('torrent-file-encoding', { progress: 0 }),
          );
        }
      } else {
        if (qbFile.size <= MAX_FILE_SIZE) {
          ctx.replyWithDocument(file);
        } else {
          await ctx.reply(ctx.t('torrent-file-too-large'));
        }
      }
    } catch (error) {
      this.logger.error(error, 'An error occured while sending file');
    }
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
      return hash;
    } catch (error) {
      this.logger.error(error, 'An error occured while adding new torrent');
      throw error;
    }
  }

  private async getTorrents(hashes: string[]) {
    try {
      return this.qBittorrent.getTorrents({ hashes });
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
      throw error;
    }
  }

  private async getTorrentByUid(uid: string) {
    try {
      const [torrent] = await this.qBittorrent.getTorrents({
        tag: `uid_${uid}`,
      });
      return torrent;
    } catch (error) {
      this.logger.error(error, 'An error occured while fetching torrents');
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

    for (const torrent of torrents) {
      if (torrent.progress < 1) {
        pendingTorrents.push(torrent);
      } else {
        completedTorrents.push(torrent);
      }
    }

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
        .map((torrent) => this.formatTorrent(chatId, torrent))
        .join('\n\n\n');

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
        .map((torrent) => this.formatTorrent(chatId, torrent))
        .join('\n\n\n');

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

  private formatSearchResult(ctx: C, se: SearchEngine, result: SearchResult) {
    const uid = `${se.name}_${result.id}`;
    const size = formatBytes(result.size ?? 0);
    const download = `/dl_${uid}`;
    const detailsLink = result.detailsUrl
      ? `<a href="${result.detailsUrl}">[⇲]</a>`
      : '';

    return ctx.t('search-message', {
      title: result.title,
      size,
      seeds: result.seeds ?? 0,
      peers: result.peers ?? 0,
      publishDate: result.publishDate ?? '---',
      detailsLink,
      download,
    });
  }

  private formatTorrent(chatId: number, torrent: QBTorrent) {
    const tagPrefixI18n = `i18n_${chatId}_`;
    const tagPrefixUid = 'uid_';
    const tagI18n = torrent.tags.find((tag) => tag.startsWith(tagPrefixI18n));
    const tagUid = torrent.tags.find((tag) => tag.startsWith(tagPrefixUid));
    const locale = tagI18n?.replace(tagPrefixI18n, '') ?? 'en';
    const uid = tagUid?.replace(tagPrefixUid, '');
    const speed = `${formatBytes(torrent.dlspeed)}/s`;
    const eta =
      torrent.eta >= 8_640_000 ? '∞' : formatDuration(torrent.eta, locale);
    const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;
    const files = `/ls_${uid}`;
    const remove = `/rm_${uid}`;

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

  private formatTorrentFile(ctx: C, torrentUid: string, file: QBFile) {
    const download = `/dl_file_${torrentUid}_${file.index}`;
    const size = formatBytes(file.size ?? 0);

    return ctx.t('torrent-file-message', {
      name: file.name,
      size,
      download,
    });
  }
}
