import { Composer } from 'grammy';
import type { MyContext } from '../../../Context.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { Logger } from '../../../utils/Logger.js';

export interface MediaHandlerOptions {
  torrentService: TorrentService;
  logger: Logger;
}

export class MediaHandler extends Composer<MyContext> {
  private torrentService: TorrentService;
  private logger: Logger;

  constructor(options: MediaHandlerOptions) {
    super();
    this.torrentService = options.torrentService;
    this.logger = options.logger;

    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message?.text) return next();
      if (ctx.message.text.startsWith('/preview_')) {
        return handlePreviewCommand(ctx, this.torrentService, this.logger);
      }
      if (ctx.message.text.startsWith('/thumb_')) {
        return handleThumbnailCommand(ctx, this.torrentService, this.logger);
      }
      return next();
    });
  }
}

export async function handlePreviewCommand(
  ctx: MyContext,
  torrentService: TorrentService,
  logger: Logger,
) {
  if (!ctx.message?.text) return;
  const parts = ctx.message.text.split('_');
  const uid = parts[1] || parts[2];
  const index = Number(parts[2] || parts[3]);

  if (!uid || Number.isNaN(index)) {
    await ctx.reply(ctx.t('preview-error'));
    return;
  }

  try {
    const meta = await torrentService.getTorrentByUid(uid);
    if (!meta) {
      await ctx.reply(ctx.t('file-not-found'));
      return;
    }

    const files = await torrentService.getTorrentFiles(meta.hash, [index]);
    if (!files || files.length === 0) {
      await ctx.reply(ctx.t('file-not-found'));
      return;
    }

    // Placeholder behaviour: reply that preview is ready
    await ctx.reply(ctx.t('preview-started'));
  } catch (error) {
    logger.error(error, 'Failed to generate preview');
    await ctx.reply(ctx.t('preview-error'));
  }
}

export async function handleThumbnailCommand(
  ctx: MyContext,
  torrentService: TorrentService,
  logger: Logger,
) {
  if (!ctx.message?.text) return;
  const parts = ctx.message.text.split('_');
  const uid = parts[1] || parts[2];
  const index = Number(parts[2] || parts[3]);

  if (!uid || Number.isNaN(index)) {
    await ctx.reply(ctx.t('thumb-error'));
    return;
  }

  try {
    const meta = await torrentService.getTorrentByUid(uid);
    if (!meta) {
      await ctx.reply(ctx.t('file-not-found'));
      return;
    }

    const files = await torrentService.getTorrentFiles(meta.hash, [index]);
    if (!files || files.length === 0) {
      await ctx.reply(ctx.t('file-not-found'));
      return;
    }

    await ctx.reply(ctx.t('thumb-started'));
  } catch (error) {
    logger.error(error, 'Failed to generate thumbnail');
    await ctx.reply(ctx.t('thumb-error'));
  }
}

export default MediaHandler;
