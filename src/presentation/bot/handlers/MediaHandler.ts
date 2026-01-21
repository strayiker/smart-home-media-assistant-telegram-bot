import { Composer } from 'grammy';

import type { MyContext } from '../../../Context.js';
import type { MediaService } from '../../../domain/services/MediaService.js';
import type { Logger } from '../../../shared/utils/logger.js';

export interface MediaHandlerOptions {
  mediaService: MediaService;
  logger: Logger;
}

export class MediaHandler extends Composer<MyContext> {
  private mediaService: MediaService;
  private logger: Logger;

  constructor(options: MediaHandlerOptions) {
    super();
    this.mediaService = options.mediaService;
    this.logger = options.logger;

    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message?.text) return next();
      if (ctx.message.text.startsWith('/preview_')) {
        return handlePreviewCommand(ctx, this.mediaService, this.logger);
      }
      if (ctx.message.text.startsWith('/thumb_')) {
        return handleThumbnailCommand(ctx, this.mediaService, this.logger);
      }
      return next();
    });
  }
}

export async function handlePreviewCommand(
  ctx: MyContext,
  _mediaService: MediaService,
  _logger: Logger,
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
    // TODO: Implement preview generation using mediaService
    // MediaService.generatePreview() exists but needs implementation
    await ctx.reply(ctx.t('preview-started'));
  } catch (error) {
    _logger.error(error, 'Failed to generate preview');
    await ctx.reply(ctx.t('preview-error'));
  }
}

export async function handleThumbnailCommand(
  ctx: MyContext,
  _mediaService: MediaService,
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
    // TODO: Implement thumbnail generation using mediaService
    await ctx.reply(ctx.t('thumb-started'));
  } catch (error) {
    logger.error(error, 'Failed to generate thumbnail');
    await ctx.reply(ctx.t('thumb-error'));
  }
}

export default MediaHandler;
