export interface SearchResult {
  id: string;
  title: string;
  tags: string[];
  size: number;
  seeds: number;
  peers: number;
  publishDate?: Date;
  detailsUrl?: string;
  downloadUrl: string;
}

export abstract class SearchEngine {
  abstract name: string;
  abstract search(query: string): Promise<SearchResult[]>;
  abstract downloadTorrentFile(id: string): Promise<string>;
}
