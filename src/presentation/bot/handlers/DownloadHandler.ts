import { Composer } from 'grammy';

import type { MyContext } from '../../../Context.js';
import type { FileService } from '../../../domain/services/FileService.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { Logger } from '../../../utils/Logger.js';

export interface DownloadHandlerOptions {
  fileService: FileService;
  torrentService: TorrentService;
  logger: Logger;
}

export class DownloadHandler extends Composer<MyContext> {
  private fileService: FileService;
  private torrentService: TorrentService;
  private logger: Logger;

  constructor(options: DownloadHandlerOptions) {
    super();
    this.fileService = options.fileService;
    this.torrentService = options.torrentService;
    this.logger = options.logger;

    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message?.text) return next();
      if (ctx.message.text.startsWith('/dl_file_')) {
        return handleDownloadFileCommand(ctx, this.fileService, this.torrentService, this.logger);
      }
      return next();
    });
  }
}

export async function handleDownloadFileCommand(
  ctx: MyContext,
  fileService: FileService,
  torrentService: TorrentService,
  logger: Logger,
) {
  if (!ctx.message?.text) return;
  const parts = ctx.message.text.split('_');
  const uid = parts[2];
  const index = Number(parts[3]);
  if (!uid || Number.isNaN(index)) {
    await ctx.reply(ctx.t('file-download-error'));
    return;
  }

  try {
    // Verify torrent exists
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

    const file = files[0];
    // Simple policy: disallow huge non-video files
    const isVideo = file.name && ['mp4', 'mkv', 'avi'].includes(file.name.split('.').pop()?.toLowerCase() || '');
    if ((file.size ?? 0) > 2 * 1024 * 1024 * 1024 && !isVideo) {
      await ctx.reply(ctx.t('file-too-big'));
      return;
    }

    // For now reply that download is initiated; actual streaming endpoint is out of scope here
    await ctx.reply(ctx.t('file-download-started'));
  } catch (error) {
    logger.error(error, 'Failed to download file');
    await ctx.reply(ctx.t('file-download-error'));
  }
}

export default DownloadHandler;
