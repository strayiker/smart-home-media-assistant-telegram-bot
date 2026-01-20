import type { SearchEngine, SearchResult } from '../../searchEngines/SearchEngine.js';
import type { Logger } from '../../utils/Logger.js';
import { err, ok, type ResultT } from '../../utils/result.js';

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

  async search(query: string): Promise<ResultT<SearchResult[], Error>> {
    try {
      const results: SearchResult[] = [];

      const promises = this.searchEngines.map(async (searchEngine) => {
        try {
          const engineResults = await searchEngine.search(query);
          return engineResults;
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
