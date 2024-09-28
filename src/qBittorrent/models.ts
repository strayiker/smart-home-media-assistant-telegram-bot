export type QBTorrentState =
  | 'error'
  | 'missingFiles'
  | 'uploading'
  | 'pausedUP'
  | 'queuedUP'
  | 'stalledUP'
  | 'checkingUP'
  | 'forcedUP'
  | 'allocating'
  | 'downloading'
  | 'metaDL'
  | 'pausedDL'
  | 'queuedDL'
  | 'stalledDL'
  | 'checkingDL'
  | 'forcedDL'
  | 'checkingResumeData'
  | 'moving'
  | 'unknown';

export interface QBTorrent {
  /** Unix timestamp of when the torrent was added */
  added_on: number;
  /** Amount of data left to download (bytes) */
  amount_left: number;
  /** Whether Automatic Torrent Management is enabled */
  auto_tmm: boolean;
  /** Torrent availability percentage (0-1) */
  availability: number;
  /** Category of the torrent */
  category: string;
  /** Amount of data completed (bytes) */
  completed: number;
  /** Unix timestamp of when the torrent was completed */
  completion_on: number;
  /** Absolute path of the torrent content */
  content_path: string;
  /** Download speed limit (bytes/second) */
  dl_limit: number;
  /** Current download speed (bytes/second) */
  dlspeed: number;
  /** Total data downloaded (bytes) */
  downloaded: number;
  /** Data downloaded this session (bytes) */
  downloaded_session: number;
  /** Estimated time of arrival (seconds) */
  eta: number;
  /** Whether first/last piece has priority */
  f_l_piece_prio: boolean;
  /** Whether the torrent is force-started */
  force_start: boolean;
  /** Torrent hash */
  hash: string;
  /** Unix timestamp of the last activity */
  last_activity: number;
  /** Magnet URI of the torrent */
  magnet_uri: string;
  /** Maximum share ratio */
  max_ratio: number;
  /** Maximum seeding time (seconds) */
  max_seeding_time: number;
  /** Torrent name */
  name: string;
  /** Number of complete peers */
  num_complete: number;
  /** Number of incomplete peers */
  num_incomplete: number;
  /** Number of leechers connected to */
  num_leechs: number;
  /** Number of seeders connected to */
  num_seeds: number;
  /** Torrent priority */
  priority: number;
  /** Torrent progress percentage (0-1) */
  progress: number;
  /** Share ratio */
  ratio: number;
  /** Ratio limit */
  ratio_limit: number;
  /** Absolute path where the torrent is saved */
  save_path: string;
  /** Total seeding time (seconds) */
  seeding_time: number;
  /** Seeding time limit (seconds) */
  seeding_time_limit: number;
  /** Unix timestamp of when the torrent was last seen complete */
  seen_complete: number;
  /** Whether sequential download is enabled */
  seq_dl: boolean;
  /** Total size of the torrent (bytes) */
  size: number;
  /** Torrent state */
  state: QBTorrentState;
  /** Whether super seeding is enabled */
  super_seeding: boolean;
  /** Tags associated with the torrent */
  tags: string[];
  /** Total active time (seconds) */
  time_active: number;
  /** Total size of the torrent (bytes) */
  total_size: number;
  /** Tracker URL */
  tracker: string;
  /** Upload speed limit (bytes/second) */
  up_limit: number;
  /** Total data uploaded (bytes) */
  uploaded: number;
  /** Data uploaded this session (bytes) */
  uploaded_session: number;
  /** Current upload speed (bytes/second) */
  upspeed: number;
}
