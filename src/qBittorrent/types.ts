import { type QBTorrentState } from './models.js';

export interface QBClientAddTorrentsOptions {
  /** Base64 string containing data of torrent file */
  torrents?: string[];
  /** Download folder */
  savepath?: string;
  /** Category for the torrent */
  category?: string;
  /** Tags for the torrent */
  tags?: string[];
  /** Skip hash checking. Possible values are true, false (default) */
  skip_checking?: boolean;
  /** Add torrents in the paused state. Possible values are true, false (default) */
  paused?: boolean;
  /** Create the root folder. Possible values are true, false, unset (default) */
  root_folder?: boolean;
  /** Rename torrent */
  rename?: string;
  /** Set torrent upload speed limit. Unit in bytes/second */
  upLimit?: number;
  /** Set torrent download speed limit. Unit in bytes/second */
  dlLimit?: number;
  /** Set torrent share ratio limit */
  ratioLimit?: number;
  /** Set torrent seeding time limit. Unit in minutes */
  seedingTimeLimit?: number;
  /** Whether Automatic Torrent Management should be used */
  autoTMM?: boolean;
  /** Enable sequential download. Possible values are true, false (default) */
  sequentialDownload?: boolean;
  /** Prioritize download first last piece. Possible values are true, false (default) */
  firstLastPiecePrio?: boolean;
}

export interface QBClientGetTorrentsOptions {
  /** Filter torrent list by state */
  filter?: QBTorrentState;
  /** Get torrents with the given category (empty string means "without category"; no "category" parameter means "any category") */
  category?: string;
  /** Get torrents with the given tag (empty string means "without tag"; no "tag" parameter means "any tag" */
  tag?: string;
  /** Sort torrents by given key */
  sort?: string;
  /** Enable reverse sorting. Defaults to `false` */
  reverse?: boolean;
  /** Limit the number of torrents returned */
  limit?: number;
  /** Set offset (if less than 0, offset from end) */
  offset?: number;
  /** Filter by hashes */
  hashes?: string[];
}
