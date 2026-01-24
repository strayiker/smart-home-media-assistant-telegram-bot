import { type Bot, Composer, GrammyError, InlineKeyboard } from 'grammy';
import type { Message } from 'grammy/types';

import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { ChatMessageStateRepository } from '../../../infrastructure/persistence/repositories/ChatMessageStateRepository.js';
import type { ChatSettingsRepository } from '../../../infrastructure/persistence/repositories/ChatSettingsRepository.js';
import type { SearchEngine } from '../../../infrastructure/searchEngines/searchEngines/searchEngine.js';
import { logger } from '../../../logger.js';
import type { MyContext } from '../../../shared/context.js';
import { fluent } from '../../../shared/fluent.js';
import type { Logger } from '../../../shared/utils/logger.js';
import { retryAsync } from '../../../shared/utils/retry.js';

const PER_PAGE = 5;

// Minimal shape of torrent object returned by QBittorrent client used here
interface QBittorrentTorrent {
  hash: string;
  progress: number;
  dlspeed?: number;
  eta?: number;
  name?: string;
  num_seeds?: number;
  num_complete?: number;
  num_leechs?: number;
  num_incomplete?: number;
  size?: number;
}

export interface TorrentHandlerOptions {
  torrentService: TorrentService;
  logger: Logger;
  searchEngines: SearchEngine[];
  bot: Bot<MyContext>;
  chatSettingsRepository: ChatSettingsRepository;
  chatMessageStateRepository: ChatMessageStateRepository;
}

export class TorrentHandler extends Composer<MyContext> {
  private torrentService: TorrentService;
  private logger: Logger;
  private searchEngines: SearchEngine[];
  private bot: Bot<MyContext>;
  private chatMessages = new Map<number, Message>();
  private chatTorrents = new Map<number, Set<string>>();
  private activeUpdates = new Map<number, Promise<void>>();
  // Per-chat lock queue to prevent concurrent send/update/delete races
  private chatLocks = new Map<number, Promise<void>>();
  private timeout?: NodeJS.Timeout;
  private chatSettingsRepository: ChatSettingsRepository;
  private chatMessageStateRepository: ChatMessageStateRepository;

  constructor(options: TorrentHandlerOptions) {
    super();
    this.torrentService = options.torrentService;
    this.logger = options.logger;
    this.searchEngines = options.searchEngines;
    this.bot = options.bot;
    this.chatSettingsRepository = options.chatSettingsRepository;
    this.chatMessageStateRepository = options.chatMessageStateRepository;

    // Initialize state from database first, then start periodic updater.
    // This prevents races where the periodic updater runs before we restore
    // persisted message state into memory.
    void this.initialize().then(() => {
      this.timeout = setInterval(() => {
        void this.createOrUpdateTorrentsMessages();
      }, 5 * 1000);
    });

    // ensure we can cleanup the interval when application stops
    this.dispose = this.dispose.bind(this);

    // Command handlers
    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message.text) return next();
      // Let more specific `/dl_file_...` commands be handled by `DownloadHandler`.
      if (ctx.message.text.startsWith('/dl_file_')) return next();
      if (ctx.message.text.startsWith('/dl_')) {
        logger.debug({ text: ctx.message.text }, 'Download command invoked');
        return this.handleDownloadCommand(ctx);
      }
      if (ctx.message.text.startsWith('/rm_')) {
        logger.debug({ text: ctx.message.text }, 'Remove command invoked');
        return this.handleRemoveCommand(ctx);
      }
      if (ctx.message.text.startsWith('/torrents')) {
        logger.debug('Torrents list command invoked');
        return handleTorrentsListCommand(ctx, this.torrentService);
      }
      if (ctx.message.text.startsWith('/ls_')) {
        logger.debug({ text: ctx.message.text }, 'List files command invoked');
        return handleListFilesCommand(ctx, this.torrentService);
      }
      return next();
    });

    // Callback query handlers
    this.on('callback_query:data', async (ctx, next) => {
      if (!ctx.callbackQuery?.data) return next();
      if (!ctx.callbackQuery.data.startsWith('torrents:')) return next();

      const parsed = parseTorrentsCallback(ctx.callbackQuery.data);
      if (!parsed) {
        await ctx.answerCallbackQuery();
        return;
      }

      switch (parsed.action) {
        case 'page':
        case 'refresh': {
          await handleTorrentListRefresh(ctx, this.torrentService, parsed.page);
          return;
        }
        case 'files': {
          if (!parsed.uid) {
            await ctx.answerCallbackQuery();
            return;
          }
          await handleTorrentFiles(ctx, this.torrentService, parsed.uid);
          return;
        }
        case 'remove': {
          if (!parsed.uid) {
            await ctx.answerCallbackQuery();
            return;
          }
          await this.handleTorrentRemove(ctx, parsed.uid);
          return;
        }
        default: {
          await ctx.answerCallbackQuery();
          return;
        }
      }
    });
  }

  // Helper to run a function under a per-chat lock
  private async withChatLock<T>(
    chatId: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const tail = this.chatLocks.get(chatId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((res) => {
      release = res;
    });
    // chain the lock
    this.chatLocks.set(
      chatId,
      tail.then(() => next),
    );
    try {
      // wait for previous ops
      await tail;
      return await fn();
    } finally {
      // release
      release();
      const cur = this.chatLocks.get(chatId);
      if (cur === next) this.chatLocks.delete(chatId);
    }
  }

  public dispose() {
    // Always call clearInterval so tests spying on it detect the call.
    // Clearing undefined is a no-op in JS runtimes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearInterval(this.timeout as any);
  }

  /**
   * Handle /rm_ command: remove torrent and refresh progress message.
   */
  private async handleRemoveCommand(ctx: MyContext) {
    if (!ctx.message?.text) return;
    const uid = ctx.message.text.replace('/rm_', '');
    try {
      await this.torrentService.removeTorrentByUid(uid);
      await ctx.reply(ctx.t('torrents-removed-success'));
      const chatId = ctx.chatId;
      if (chatId !== undefined) {
        await this.createOrUpdateTorrentsMessage(chatId, true);
      }
    } catch (error) {
      this.logger.error(error, 'Failed to remove torrent');
      await ctx.reply(ctx.t('torrent-remove-error'));
    }
  }

  /**
   * Handle torrent removal from inline keyboard button (callback).
   */
  private async handleTorrentRemove(ctx: MyContext, uid: string) {
    try {
      await this.torrentService.removeTorrentByUid(uid);
      await ctx.answerCallbackQuery({
        text: ctx.t('torrents-removed-success'),
      });
      const chatId = ctx.chatId;
      if (chatId !== undefined) {
        await this.createOrUpdateTorrentsMessage(chatId, true);
      }
    } catch {
      await ctx.answerCallbackQuery({ text: ctx.t('torrents-removed-error') });
      return;
    }
  }

  /**
   * Handle /dl_ command: download and add torrent, then trigger progress update.
   */
  private async handleDownloadCommand(ctx: MyContext) {
    if (!ctx.message?.text) return;

    const uid = ctx.message.text.replace('/dl_', '');
    const [seName, id] = uid.split('_');

    const downloadResult = await this.torrentService.downloadTorrentFile(
      seName,
      id,
      this.searchEngines,
    );
    if (!downloadResult.ok) {
      await ctx.reply(ctx.t('torrent-download-error'));
      return;
    }

    const addResult = await this.torrentService.addTorrent({
      torrent: downloadResult.value,
      uid,
      chatId: ctx.chatId as number,
      searchEngine: seName,
      trackerId: id,
    });

    if (!addResult.ok) {
      await ctx.reply(ctx.t('torrent-download-error'));
      return;
    }

    // If torrent already existed, return existing meta information to user
    if (!addResult.value.added) {
      const hash = addResult.value.hash;
      const existingUid = addResult.value.existingMeta?.uid ?? '';
      const filesCmd = existingUid ? `/ls_${existingUid}` : '';
      try {
        await ctx.reply(ctx.t('torrent-already-exists', { hash, files: filesCmd }));
      } catch (error) {
        this.logger.debug({ err: error }, 'Failed to notify user about existing torrent');
      }
      return;
    }

    const chatId = ctx.chatId as number;
    // Trigger immediate update to show progress message (force refresh)
    await this.createOrUpdateTorrentsMessage(chatId, true);
  }

  public getCommands(): Array<{ command: string; descriptionKey: string }> {
    return [{ command: 'torrents', descriptionKey: 'commands.torrents' }];
  }

  // Periodic updater: create or update per-chat torrents message
  private async createOrUpdateTorrentsMessage(
    chatId: number,
    refresh: boolean = false,
  ) {
    // bot is required

    // Prevent concurrent updates for the same chat
    const existingUpdate = this.activeUpdates.get(chatId);
    if (existingUpdate) {
      await existingUpdate;
      return;
    }

    // Validate and fix state consistency
    const message = this.chatMessages.get(chatId);
    const hasTracking = this.chatTorrents.has(chatId);

    // If chat is tracked but no message exists, remove from tracking
    if (hasTracking && !message) {
      this.chatTorrents.delete(chatId);
    }

    // If message exists but not tracked, clean up
    if (message && !hasTracking) {
      this.chatMessages.delete(chatId);
    }

    const updatePromise = (async () => {
      try {
        const metas = await this.torrentService.getTorrentMetasByChatId(chatId);

        if (metas.length === 0) {
          this.chatMessages.delete(chatId);
          this.chatTorrents.delete(chatId);
          return;
        }

        const hashes = metas.map((m) => m.hash);

        let torrents: QBittorrentTorrent[];
        try {
          torrents = (await this.torrentService.getTorrentsByHash(
            hashes,
          )) as QBittorrentTorrent[];
        } catch {
          return;
        }

        const metaByHash = new Map(hashes.map((h, i) => [h, metas[i]]));

        const completedTorrents: QBittorrentTorrent[] = [];
        const pendingTorrents: QBittorrentTorrent[] = [];

        for (const torrent of torrents) {
          if (torrent.progress < 1) pendingTorrents.push(torrent);
          else completedTorrents.push(torrent);
        }

        let message = this.chatMessages.get(chatId);

        // Delete progress message only when there are no pending torrents
        // (i.e. all torrents are completed) and this is not a forced refresh.
        if (message && pendingTorrents.length === 0 && !refresh) {
          await this.deleteTorrentsMessage(message);
          message = undefined;
        }

        // Only pending torrents trigger a progress message
        if (pendingTorrents.length > 0) {
          const hashesPending = pendingTorrents.map((t) => t.hash);
          this.chatTorrents.set(chatId, new Set(hashesPending));

          const chatLocale =
            (await this.chatSettingsRepository.getLocale(chatId)) ?? 'en';
          const texts = pendingTorrents.map((torrent) => {
            const meta = metaByHash.get(torrent.hash);
            const uid = meta?.uid ?? '';
            const dlspeed = torrent.dlspeed ?? 0;
            const speed = `${this.torrentService.formatBytes(dlspeed)}/s`;
            const etaStr = (() => {
              if (torrent.eta === undefined) return '∞';
              if (torrent.eta >= 8_640_000) return '∞';
              return this.torrentService.formatDuration(torrent.eta);
            })();
            const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;
            const t = fluent.withLocale(chatLocale);
            return t('torrent-message-in-progress', {
              title: torrent.name ?? '',
              seeds: torrent.num_seeds ?? 0,
              maxSeeds: torrent.num_complete ?? 0,
              peers: torrent.num_leechs ?? 0,
              maxPeers: torrent.num_incomplete ?? 0,
              speed,
              eta: etaStr,
              progress,
              remove: `/rm_${uid}`,
            });
          });

          const text = texts.join('\n');
          await (message
            ? this.updateTorrentsMessage(message, text, hashesPending)
            : this.sendTorrentsMessage(chatId, text, hashesPending));
        } else {
          this.chatTorrents.delete(chatId);
        }
      } finally {
        this.activeUpdates.delete(chatId);
      }
    })();

    this.activeUpdates.set(chatId, updatePromise);
    await updatePromise;
  }

  private createOrUpdateTorrentsMessages() {
    for (const chatId of this.chatTorrents.keys()) {
      void this.createOrUpdateTorrentsMessage(chatId);
    }
  }

  private async sendTorrentsMessage(
    chatId: number,
    text: string,
    torrentUids: string[] = [],
  ) {
    return this.withChatLock(chatId, async () => {
      try {
        const message = await this.bot.api.sendMessage(chatId, text, {
          parse_mode: 'HTML',
        });
        // store message for future edits
        this.chatMessages.set(chatId, message as Message);

        // Debug: previous saved state (if any)
        try {
          const prev = await this.chatMessageStateRepository.getMessageState(
            chatId,
            'torrent_progress',
          );
          this.logger.debug(
            { chatId, prevMessageId: prev?.messageId },
            'Sending new torrents message',
          );
        } catch (error) {
          this.logger.debug(
            { error },
            'Failed to fetch previous message state before send',
          );
        }

        // Save to database for persistence (upsert)
        await this.saveMessageState(chatId, message.message_id, torrentUids);
        this.logger.debug(
          { chatId, messageId: message.message_id },
          'Saved message state after send',
        );
      } catch (error) {
        this.logger.error(
          error,
          'An error occured while sending torrents message',
        );
      }
    });
  }

  private async updateTorrentsMessage(
    message: Message,
    text: string,
    torrentUids: string[] = [],
  ) {
    if (message.text === text) return;
    const chatId = message.chat.id;
    return this.withChatLock(chatId, async () => {
      try {
        await retryAsync(
          () =>
            this.bot.api.editMessageText(chatId, message.message_id, text, {
              parse_mode: 'HTML',
            }),
          {
            retries: 1,
            delayMs: 200,
            retryIf: (err) =>
              err instanceof GrammyError &&
              err.description === 'Bad Request: message to edit not found',
            onRetry: () =>
              this.logger.debug(
                { chatId, messageId: message.message_id },
                'Edit failed: message not found; retrying after 200ms',
              ),
          },
        );

        message.text = text;
        // Save updated state to database
        await this.saveMessageState(chatId, message.message_id, torrentUids);
        this.logger.debug(
          { chatId, messageId: message.message_id },
          'Updated torrents message',
        );
        return;
      } catch (error) {
        if (
          error instanceof GrammyError &&
          error.description === 'Bad Request: message to edit not found'
        ) {
          this.logger.debug(
            { chatId, messageId: message.message_id },
            'Edit retry failed; recreating message',
          );
          // remove stale in-memory ref
          this.chatMessages.delete(chatId);
          // Do not delete DB record here — saveMessageState will upsert new id
          await this.sendTorrentsMessage(chatId, text, torrentUids);
          return;
        }
        this.logger.error(
          error,
          'An error occured while updating torrents message',
        );
      }
    });
  }

  /**
   * Save message state to database for persistence.
   */
  private async saveMessageState(
    chatId: number,
    messageId: number,
    torrentUids: string[],
  ): Promise<void> {
    // repository is required

    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await this.chatMessageStateRepository.saveMessageState({
        chatId,
        messageType: 'torrent_progress',
        messageId,
        data: { uids: torrentUids },
        expiresAt,
      });
    } catch (error) {
      // Log but don't fail - message state is non-critical
      this.logger.error(error, 'Failed to save message state to database');
    }
  }

  private async deleteTorrentsMessage(message: Message) {
    const chatId = message.chat.id;
    return this.withChatLock(chatId, async () => {
      try {
        // Attempt delete in Telegram first
        await this.bot.api.deleteMessage(chatId, message.message_id);
      } catch (error) {
        if (
          error instanceof GrammyError &&
          error.description === 'Bad Request: message to delete not found'
        ) {
          // Message already gone externally — continue to cleanup
          this.logger.debug(
            { chatId, messageId: message.message_id },
            'Message already deleted on Telegram',
          );
        } else {
          this.logger.error(
            error,
            'An error occured while deleting torrent message',
          );
          return;
        }
      } finally {
        // Remove from tracking AFTER attempting delete
        this.chatTorrents.delete(chatId);
        this.chatMessages.delete(chatId);
        // Remove from database regardless (we no longer depend on DB record after delete)
        try {
          await this.chatMessageStateRepository.deleteMessageState(
            chatId,
            'torrent_progress',
          );
        } catch (error) {
          this.logger.error(
            error,
            'Failed to delete message state from DB after delete',
          );
        }
      }
    });
  }

  /**
   * Initialize state from database after bot restart.
   * Restores chatMessages and chatTorrents maps from persisted state.
   */
  public async initialize(): Promise<void> {
    if (!this.chatMessageStateRepository) {
      this.logger.debug(
        'ChatMessageStateRepository not available, skipping initialization',
      );
      return;
    }

    try {
      // Remove expired records immediately on initialization
      try {
        const removed =
          await this.chatMessageStateRepository.cleanupExpiredMessages();
        if (removed > 0) {
          this.logger.debug(
            { count: removed },
            'Removed expired message states on init',
          );
        }
      } catch (error) {
        this.logger.error(
          error,
          'Failed to cleanup expired message states on init',
        );
      }

      const states =
        await this.chatMessageStateRepository.getAllActiveTorrentProgressMessages();

      this.logger.info(
        { count: states.length },
        'Restoring torrent progress messages from database',
      );

      for (const state of states) {
        const { chatId, messageId, data } = state;
        const uids = (data as { uids?: string[] })?.uids || [];

        // Restore in-memory tracking
        this.chatMessages.set(chatId, {
          chat: { id: chatId },
          message_id: messageId,
        } as Message);
        this.chatTorrents.set(chatId, new Set(uids));
      }

      this.logger.info(
        { count: states.length },
        'Successfully restored torrent progress messages',
      );
    } catch (error) {
      this.logger.error(error, 'Failed to initialize torrent message state');
    }
  }
}

// Torrent List handlers
export async function handleTorrentsListCommand(
  ctx: MyContext,
  torrentService: TorrentService,
) {
  if (ctx.chatId === undefined) return;

  try {
    const result = await buildTorrentsList(ctx, torrentService, 1);
    await ctx.reply(result.text, {
      parse_mode: 'HTML',
      reply_markup: result.keyboard,
    });
  } catch {
    await ctx.reply(ctx.t('torrents-list-error'));
  }
}

export async function handleTorrentListRefresh(
  ctx: MyContext,
  torrentService: TorrentService,
  page: number,
) {
  if (ctx.chatId === undefined) return;

  try {
    const result = await buildTorrentsList(ctx, torrentService, page);
    await ctx.editMessageText(result.text, {
      parse_mode: 'HTML',
      reply_markup: result.keyboard,
    });
  } catch {
    await ctx.editMessageText(ctx.t('torrents-list-error'));
  }
}

export async function handleTorrentFiles(
  ctx: MyContext,
  torrentService: TorrentService,
  uid: string,
) {
  await ctx.answerCallbackQuery();
  const files = await torrentService.getTorrentFilesByUid(uid);

  if (files.length === 0) {
    await ctx.reply(ctx.t('torrent-files-empty'));
    return;
  }

  const texts = files.map((file) =>
    torrentService.formatTorrentFileItem(ctx, uid, file),
  );
  const text = texts.join('\n');

  await ctx.reply(text, { parse_mode: 'HTML' });
}

export async function handleListFilesCommand(
  ctx: MyContext,
  torrentService: TorrentService,
) {
  if (!ctx.message?.text) return;
  const uid = ctx.message.text.replace('/ls_', '');

  const files = await torrentService.getTorrentFilesByUid(uid);

  if (files.length === 0) {
    await ctx.reply(ctx.t('torrent-files-empty'));
    return;
  }

  const texts = files.map((file) =>
    torrentService.formatTorrentFileItem(ctx, uid, file),
  );
  const text = texts.join('\n');

  await ctx.reply(text, { parse_mode: 'HTML' });
}

// Helper functions
export interface TorrentsCallbackData {
  action: 'page' | 'refresh' | 'files' | 'remove';
  page: number;
  uid?: string;
}

export function parseTorrentsCallback(
  data: string,
): TorrentsCallbackData | undefined {
  const parts = data.split(':');
  if (parts.length < 3 || parts[0] !== 'torrents') {
    return undefined;
  }

  const action = parts[1] as TorrentsCallbackData['action'];

  if (action === 'page' || action === 'refresh') {
    const page = Number(parts[2]);
    if (Number.isNaN(page)) {
      return undefined;
    }
    return { action, page };
  }

  if (action === 'files' || action === 'remove') {
    const uid = parts[2];
    const page = Number(parts[3] ?? '1');
    if (!uid || Number.isNaN(page)) {
      return undefined;
    }
    return { action, page, uid };
  }

  return undefined;
}

export async function buildTorrentsList(
  ctx: MyContext,
  torrentService: TorrentService,
  page: number,
) {
  logger.debug({ chatId: ctx.chatId, page }, 'buildTorrentsList start');
  if (ctx.chatId === undefined) {
    throw new Error('chatId is undefined');
  }

  const metas = await torrentService.getTorrentMetasByChatId(ctx.chatId);

  if (metas.length === 0) {
    const keyboard = new InlineKeyboard();
    return {
      text: `${ctx.t('torrents-list-empty')}\n${ctx.t('torrents-list-empty-hint')}`,
      keyboard,
    };
  }

  const totalPages = Math.max(1, Math.ceil(metas.length / PER_PAGE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageMetas = metas.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const hashes = pageMetas.map((meta) => meta.hash);
  const torrents = await torrentService.getTorrentsByHash(hashes);
  const torrentByHash = new Map(
    torrents.map((torrent) => [torrent.hash, torrent]),
  );

  const items: string[] = [];
  const keyboard = new InlineKeyboard();

  for (const meta of pageMetas) {
    const torrent = torrentByHash.get(meta.hash);
    if (!torrent) continue;

    const progress = `${Math.round(torrent.progress * 100 * 100) / 100}%`;
    const eta =
      torrent.eta >= 8_640_000
        ? '∞'
        : torrentService.formatDuration(torrent.eta);

    if (torrent.progress < 1) {
      // Use the same detailed in-progress template as progress messages
      items.push(
        ctx.t('torrent-message-in-progress', {
          title: torrent.name ?? '',
          seeds: torrent.num_seeds ?? 0,
          maxSeeds: torrent.num_complete ?? 0,
          peers: torrent.num_leechs ?? 0,
          maxPeers: torrent.num_incomplete ?? 0,
          speed: `${torrentService.formatBytes(torrent.dlspeed)}/s`,
          eta,
          progress,
          remove: `/rm_${meta.uid}`,
        }),
      );
    } else {
      // Use the same completed template as progress messages for parity
      items.push(
        ctx.t('torrent-message-completed', {
          title: torrent.name ?? '',
          progress,
          files: `/ls_${meta.uid}`,
          remove: `/rm_${meta.uid}`,
        }),
      );
    }
  }

  if (items.length === 0) {
    const emptyKeyboard = new InlineKeyboard();
    return {
      text: `${ctx.t('torrents-list-empty')}\n${ctx.t('torrents-list-empty-hint')}`,
      keyboard: emptyKeyboard,
    };
  }

  if (totalPages > 1) {
    if (safePage > 1) {
      keyboard.text(
        ctx.t('torrents-btn-prev'),
        `torrents:page:${safePage - 1}`,
      );
    }
    if (safePage < totalPages) {
      keyboard.text(
        ctx.t('torrents-btn-next'),
        `torrents:page:${safePage + 1}`,
      );
    }
    keyboard.row();
  }

  return {
    text: `${ctx.t('torrents-list-title', { page: safePage, totalPages })}\n${items.join('\n')}`,
    keyboard,
  };
}

export default TorrentHandler;
