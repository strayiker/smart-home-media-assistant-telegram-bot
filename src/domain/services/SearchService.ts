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
      const promises = this.searchEngines.map(async (searchEngine) => {
        try {
          const engineResults = await searchEngine.search(query);
          return engineResults.map((result: SearchResult) => [searchEngine, result] as const);
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
