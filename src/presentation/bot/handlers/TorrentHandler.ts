import { Composer } from 'grammy';

import type { MyContext } from '../../../Context.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { SearchEngine } from '../../../searchEngines/SearchEngine.js';
import type { Logger } from '../../../utils/Logger.js';

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

    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message.text) return next();
      if (ctx.message.text.startsWith('/dl_')) {
        return handleDownloadCommand(ctx, this.torrentService, this.searchEngines);
      }
      if (ctx.message.text.startsWith('/rm_')) {
        return handleRemoveCommand(ctx, this.torrentService, this.logger);
      }
      return next();
    });
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

  const downloadResult = await torrentService.downloadTorrentFile(seName, id, searchEngines);
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

export default TorrentHandler;
