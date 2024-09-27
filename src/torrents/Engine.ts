export interface SearchResult {
  engineName: string;
  title: string;
  totalSize?: number;
  seeds?: number;
  leeches?: number;
  createdAt?: Date;
  trackerUrl?: string;
  downloadUrl: string;
}

export abstract class Engine {
  abstract name: string;
  abstract search(query: string): Promise<SearchResult[]>;
  abstract downloadTorrentFile(url: string): Promise<string>;
}
