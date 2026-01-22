import { Composer } from 'grammy';

import type { FileService } from '../../../domain/services/FileService.js';
import type { MyContext } from '../../../shared/context.js';
import type { Logger } from '../../../shared/utils/logger.js';

export interface FileHandlerOptions {
  fileService: FileService;
  logger: Logger;
}

export class FileHandler extends Composer<MyContext> {
  private fileService: FileService;
  private logger: Logger;

  constructor(options: FileHandlerOptions) {
    super();
    this.fileService = options.fileService;
    this.logger = options.logger;

    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message?.text) return next();
      if (ctx.message.text.startsWith('/files_')) {
        return handleListFilesCommand(ctx, this.fileService, this.logger);
      }
      return next();
    });
  }
}

export async function handleListFilesCommand(
  ctx: MyContext,
  fileService: FileService,
  logger: Logger,
) {
  if (!ctx.message?.text) return;
  const uid = ctx.message.text.replace('/files_', '');
  try {
    const list = await fileService.listFilesByUid(uid);
    if (!list || list.length === 0) {
      await ctx.reply(ctx.t('files-empty'));
      return;
    }
    await ctx.reply(list.join('\n'));
  } catch (error) {
    logger.error(error, 'Failed to list files');
    await ctx.reply(ctx.t('files-error'));
  }
}

export default FileHandler;
