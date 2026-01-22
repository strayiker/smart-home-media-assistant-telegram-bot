import type {
  SearchEngine,
  SearchResult,
} from '../../infrastructure/searchEngines/searchEngines/searchEngine.js';
import type { Logger } from '../../shared/utils/logger.js';
import { err, ok, type ResultT } from '../../shared/utils/result.js';

export interface SearchServiceOptions {
  searchEngines: SearchEngine[];
  logger: Logger;
}

export class SearchService {
  private searchEngines: SearchEngine[];
  private logger: Logger;

  constructor(options: SearchServiceOptions) {
    this.searchEngines = options.searchEngines;
    this.logger = options.logger;
  }

  setSearchEngines(searchEngines: SearchEngine[]): void {
    this.searchEngines = searchEngines;
  }

  async search(
    query: string,
  ): Promise<ResultT<(readonly [SearchEngine, SearchResult])[], Error>> {
    try {
      this.logger.debug({ query }, 'Starting search');
      const promises = this.searchEngines.map(async (searchEngine) => {
        const start = Date.now();
        this.logger.debug(
          { engine: searchEngine.name, query },
          'Invoking search engine',
        );
        try {
          const engineResults = await searchEngine.search(query);
          const took = Date.now() - start;
          this.logger.debug(
            { engine: searchEngine.name, count: engineResults.length, took },
            'Search engine returned results',
          );
          return engineResults.map(
            (result: SearchResult) => [searchEngine, result] as const,
          );
        } catch (error) {
          this.logger.error(
            error,
            'An error occurred while searching with engine: %s',
            searchEngine.name,
          );
          return [];
        }
      });

      const awaited = await Promise.all(promises);
      const total = awaited.reduce((acc, cur) => acc + cur.length, 0);
      this.logger.debug({ total }, 'Aggregated search results count');
      const results: (readonly [SearchEngine, SearchResult])[] = [];

      for (const engineResults of awaited) {
        results.push(...engineResults);
      }

      return ok(results);
    } catch (error) {
      this.logger.error(error, 'An error occurred during search');
      return err(new Error('Unknown search error'));
    }
  }
}
