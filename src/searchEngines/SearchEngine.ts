export interface SearchResult {
  id: string;
  title: string;
  totalSize?: number;
  seeds?: number;
  leeches?: number;
  date?: Date;
  trackerUrl?: string;
  downloadUrl: string;
}

export abstract class SearchEngine {
  abstract name: string;
  abstract search(query: string): Promise<SearchResult[]>;
  abstract downloadTorrentFile(id: string): Promise<string>;
}
