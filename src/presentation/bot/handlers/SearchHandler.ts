import { Composer, InlineKeyboard } from 'grammy';

import type { MyContext } from '../../../shared/context.js';
import type { SearchService } from '../../../domain/services/SearchService.js';
import type {
  SearchEngine,
  SearchResult,
} from '../../../infrastructure/searchEngines/searchEngines/searchEngine.js';
import { formatBytes } from '../../../shared/utils/formatBytes.js';
import type { Logger } from '../../../shared/utils/logger.js';

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

    this.on(
      'message:text',
      async (ctx: MyContext, next: () => Promise<unknown>) => {
        return handleSearchMessage(ctx, this.searchService, this.logger, next);
      },
    );

    this.on(
      'callback_query:data',
      async (ctx: MyContext, next: () => Promise<unknown>) => {
        const data = ctx.callbackQuery?.data;
        if (!data?.startsWith('search:')) {
          return next();
        }

        const parsed = this.parseSearchCallback(data);

        if (!parsed || ctx.chatId === undefined) {
          await ctx.answerCallbackQuery();
          return;
        }

        const results = await this.searchService.search(parsed.query);

        if (!results.ok) {
          this.logger.error(results.error, 'Search failed in callback');
          if (ctx.callbackQuery?.message?.message_id) {
            await ctx.editMessageText(ctx.t('search-unknown-error'));
          }
          await ctx.answerCallbackQuery();
          return;
        }

        const searchResults = results.value;
        const { text, keyboard } = this.formatSearchResultsMessage(
          ctx,
          searchResults.slice(0, 5 * (parsed.page + 1)),
          parsed.query,
          parsed.page,
        );

        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        await ctx.answerCallbackQuery();
      },
    );
  }

  private parseSearchCallback(
    data: string,
  ): { query: string; page: number } | undefined {
    const parsed = data.replace('search:', '');
    const [query, pageStr] = parsed.split(':');
    const page = pageStr ? Number.parseInt(pageStr, 10) : 0;

    if (Number.isNaN(page) || query === '') {
      return undefined;
    }

    return { query, page };
  }

  private formatSearchResultsMessage(
    ctx: MyContext,
    results: (readonly [SearchEngine, SearchResult])[],
    _query: string,
    page: number,
  ): { text: string; keyboard: InlineKeyboard } {
    const lines = results
      .slice(0, 5 * (page + 1))
      .map(([se, result]) => this.formatSearchResultLine(ctx, se, result));

    const text = lines.join('\n');

    const buttons = results.slice(0, 5).map(([se, result]) => ({
      text: `⏩ ${result.title.slice(0, 30)}`,
      callback_data: `search:${_query}:${Math.floor(results.indexOf([se, result]) / 5)}`,
    }));

    const hasMore = results.length > 5;
    if (hasMore) {
      buttons.push({
        text: '➡️',
        callback_data: `search:${_query}:${Math.floor(results.length / 5)}`,
      });
    }

    const keyboard = InlineKeyboard.from(buttons.map((b) => [b]));
    return { text, keyboard };
  }

  private formatSearchResultLine(
    ctx: MyContext,
    se: SearchEngine,
    result: SearchResult,
  ): string {
    const size = formatBytes(result.size ?? 0);
    const download = `/dl_${se.name}_${result.id}`;

    return ctx.t('search-message-line', {
      title: result.title,
      tags: result.tags.map((tag: string) => `[#${tag}]`).join(', '),
      size,
      seeds: result.seeds ?? 0,
      peers: result.peers ?? 0,
      publishDate: result.publishDate ?? '---',
      download,
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
        .map(([se, r]) => `${r.title} (${se.name}) — ${r.size} bytes`)
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
