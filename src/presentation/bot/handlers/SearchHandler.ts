import { Composer } from 'grammy';

import type { MyContext } from '../../../Context.js';
import type { SearchService } from '../../../domain/services/SearchService.js';
import type { Logger } from '../../../utils/Logger.js';

export interface SearchHandlerOptions {
  searchService: SearchService;
  logger: Logger;
}

export class SearchHandler extends Composer<MyContext> {
  private searchService: SearchService;
  private logger: Logger;

  constructor(options: SearchHandlerOptions) {
    super();
    this.searchService = options.searchService;
    this.logger = options.logger;

    this.on('message:text', async (ctx, next) => {
      return handleSearchMessage(ctx, this.searchService, this.logger, next);
    });
  }
}

export async function handleSearchMessage(
  ctx: MyContext,
  searchService: SearchService,
  logger: Logger,
  next?: () => Promise<unknown>,
) {
  // only handle simple text queries (avoid bot commands)
  if (ctx.message?.text?.startsWith('/')) return next ? next() : undefined;
  try {
    const result = await searchService.search(ctx.message?.text || '');
    if (result.ok) {
      if (result.value.length === 0) {
        await ctx.reply(ctx.t('search-empty-results'));
        return;
      }
      const text = result.value
        .slice(0, 5)
        .map((r) => `${r.title} — ${r.size} bytes`)
        .join('\n');
      await ctx.reply(text);
    } else {
      logger.error(result.error, 'SearchService error');
      await ctx.reply(ctx.t('search-unknown-error'));
    }
  } catch (error) {
    logger.error(error, 'Unhandled error in SearchHandler');
    await ctx.reply(ctx.t('search-unknown-error'));
  }
}

export default SearchHandler;
