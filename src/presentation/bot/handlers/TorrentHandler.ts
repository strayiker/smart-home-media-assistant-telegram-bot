import { Composer, InlineKeyboard } from 'grammy';

import type { MyContext } from '../../../shared/context.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { SearchEngine } from '../../../searchEngines/SearchEngine.js';
import type { Logger } from '../../../shared/utils/logger.js';

const PER_PAGE = 5;

export interface TorrentHandlerOptions {
  torrentService: TorrentService;
  logger: Logger;
  searchEngines: SearchEngine[];
}

export class TorrentHandler extends Composer<MyContext> {
  private torrentService: TorrentService;
  private logger: Logger;
  private searchEngines: SearchEngine[];

  constructor(options: TorrentHandlerOptions) {
    super();
    this.torrentService = options.torrentService;
    this.logger = options.logger;
    this.searchEngines = options.searchEngines;

    // Command handlers
    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message.text) return next();
      if (ctx.message.text.startsWith('/dl_')) {
        return handleDownloadCommand(
          ctx,
          this.torrentService,
          this.searchEngines,
        );
      }
      if (ctx.message.text.startsWith('/rm_')) {
        return handleRemoveCommand(ctx, this.torrentService, this.logger);
      }
      if (ctx.message.text.startsWith('/torrents')) {
        return handleTorrentsListCommand(ctx, this.torrentService);
      }
      if (ctx.message.text.startsWith('/ls_')) {
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
          await handleTorrentRemove(
            ctx,
            this.torrentService,
            parsed.uid,
            parsed.page,
          );
          return;
        }
        default: {
          await ctx.answerCallbackQuery();
          return;
        }
      }
    });
  }

  public getCommands(): Array<{ command: string; descriptionKey: string }> {
    return [{ command: 'torrents', descriptionKey: 'commands.torrents' }];
  }
}

export async function handleDownloadCommand(
  ctx: MyContext,
  torrentService: TorrentService,
  searchEngines: SearchEngine[],
) {
  if (!ctx.message?.text) return;

  const uid = ctx.message.text.replace('/dl_', '');
  const [seName, id] = uid.split('_');

  const downloadResult = await torrentService.downloadTorrentFile(
    seName,
    id,
    searchEngines,
  );
  if (!downloadResult.ok) {
    await ctx.reply(ctx.t('torrent-download-error'));
    return;
  }

  const addResult = await torrentService.addTorrent({
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

  await ctx.reply(ctx.t('torrent-download-success'));
}

export async function handleRemoveCommand(
  ctx: MyContext,
  torrentService: TorrentService,
  logger: Logger,
) {
  if (!ctx.message?.text) return;
  const uid = ctx.message.text.replace('/rm_', '');
  try {
    await torrentService.removeTorrentByUid(uid);
    await ctx.reply(ctx.t('torrents-removed-success'));
  } catch (error) {
    logger.error(error, 'Failed to remove torrent');
    await ctx.reply(ctx.t('torrent-remove-error'));
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

export async function handleTorrentRemove(
  ctx: MyContext,
  torrentService: TorrentService,
  uid: string,
  page: number,
) {
  try {
    await torrentService.removeTorrentByUid(uid);
    await ctx.answerCallbackQuery({ text: ctx.t('torrents-removed-success') });
  } catch {
    await ctx.answerCallbackQuery({ text: ctx.t('torrents-removed-error') });
    return;
  }

  if (ctx.chatId === undefined) return;
  try {
    const result = await buildTorrentsList(ctx, torrentService, page);
    await ctx.editMessageText(result.text, {
      parse_mode: 'HTML',
      reply_markup: result.keyboard,
    });
  } catch {
    // Ignore error on refresh
  }
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
  if (ctx.chatId === undefined) {
    throw new Error('chatId is undefined');
  }

  const metas = await torrentService.getTorrentMetasByChatId(ctx.chatId);

  if (metas.length === 0) {
    const keyboard = new InlineKeyboard().text(
      ctx.t('torrents-btn-refresh'),
      'torrents:refresh:1',
    );
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
      items.push(
        ctx.t('torrents-item-downloading', {
          title: torrent.name,
          progress,
          speed: `${torrentService.formatBytes(torrent.dlspeed)}/s`,
          eta,
        }),
      );
      keyboard
        .text(
          ctx.t('torrents-btn-remove'),
          `torrents:remove:${meta.uid}:${safePage}`,
        )
        .row();
    } else {
      items.push(
        ctx.t('torrents-item-completed', {
          title: torrent.name,
          progress,
          size: torrentService.formatBytes(torrent.size),
        }),
      );
      keyboard
        .text(
          ctx.t('torrents-btn-files'),
          `torrents:files:${meta.uid}:${safePage}`,
        )
        .text(
          ctx.t('torrents-btn-remove'),
          `torrents:remove:${meta.uid}:${safePage}`,
        )
        .row();
    }
  }

  if (items.length === 0) {
    const emptyKeyboard = new InlineKeyboard().text(
      ctx.t('torrents-btn-refresh'),
      `torrents:refresh:${safePage}`,
    );
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
    keyboard.text(
      ctx.t('torrents-btn-refresh'),
      `torrents:refresh:${safePage}`,
    );
    if (safePage < totalPages) {
      keyboard.text(
        ctx.t('torrents-btn-next'),
        `torrents:page:${safePage + 1}`,
      );
    }
    keyboard.row();
  } else {
    keyboard.text(
      ctx.t('torrents-btn-refresh'),
      `torrents:refresh:${safePage}`,
    );
  }

  return {
    text: `${ctx.t('torrents-list-title', { page: safePage, totalPages })}\n\n${items.join('\n\n')}`,
    keyboard,
  };
}

export default TorrentHandler;
