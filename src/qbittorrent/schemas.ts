import { z } from 'zod';

import { type QBTorrent } from './models.js';

const toNumber = (value: unknown) => {
  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }

  return value;
};

const toBoolean = (value: unknown) => {
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  return value;
};

const numberish = z.preprocess(toNumber, z.number()).optional().default(0);
const booleanish = z
  .preprocess(toBoolean, z.boolean())
  .optional()
  .default(false);
const stringDefaultEmpty = z.string().optional().default('');

export const QBTorrentStateSchema = z.enum([
  'error',
  'missingFiles',
  'uploading',
  'pausedUP',
  'queuedUP',
  'stalledUP',
  'checkingUP',
  'forcedUP',
  'allocating',
  'downloading',
  'metaDL',
  'pausedDL',
  'queuedDL',
  'stalledDL',
  'checkingDL',
  'forcedDL',
  'checkingResumeData',
  'moving',
  'unknown',
]);

export const QBTorrentRawSchema = z
  .object({
    hash: z.string(),
    name: stringDefaultEmpty,
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .default(''),
    size: numberish,
    progress: numberish,
    state: QBTorrentStateSchema.optional().default('unknown'),
    save_path: stringDefaultEmpty,
    added_on: numberish,
    amount_left: numberish,
    auto_tmm: booleanish,
    availability: numberish,
    category: stringDefaultEmpty,
    completed: numberish,
    completion_on: numberish,
    content_path: stringDefaultEmpty,
    dl_limit: numberish,
    dlspeed: numberish,
    downloaded: numberish,
    downloaded_session: numberish,
    eta: numberish,
    f_l_piece_prio: booleanish,
    force_start: booleanish,
    last_activity: numberish,
    magnet_uri: stringDefaultEmpty,
    max_ratio: numberish,
    max_seeding_time: numberish,
    num_complete: numberish,
    num_incomplete: numberish,
    num_leechs: numberish,
    num_seeds: numberish,
    priority: numberish,
    ratio: numberish,
    ratio_limit: numberish,
    seeding_time: numberish,
    seeding_time_limit: numberish,
    seen_complete: numberish,
    seq_dl: booleanish,
    super_seeding: booleanish,
    time_active: numberish,
    total_size: numberish,
    tracker: stringDefaultEmpty,
    up_limit: numberish,
    uploaded: numberish,
    uploaded_session: numberish,
    upspeed: numberish,
  })
  .passthrough();

export const QBTorrentsResponseSchema = z.array(QBTorrentRawSchema);

export type QBTorrentRaw = z.infer<typeof QBTorrentRawSchema>;

export const normalizeTags = (raw?: string | string[]) => {
  if (!raw) return [] as string[];
  const values = Array.isArray(raw) ? raw : raw.split(',');
  return values.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
};

export const normalizeTorrent = (raw: QBTorrentRaw): QBTorrent => ({
  added_on: raw.added_on,
  amount_left: raw.amount_left,
  auto_tmm: raw.auto_tmm,
  availability: raw.availability,
  category: raw.category,
  completed: raw.completed,
  completion_on: raw.completion_on,
  content_path: raw.content_path,
  dl_limit: raw.dl_limit,
  dlspeed: raw.dlspeed,
  downloaded: raw.downloaded,
  downloaded_session: raw.downloaded_session,
  eta: raw.eta,
  f_l_piece_prio: raw.f_l_piece_prio,
  force_start: raw.force_start,
  hash: raw.hash,
  last_activity: raw.last_activity,
  magnet_uri: raw.magnet_uri,
  max_ratio: raw.max_ratio,
  max_seeding_time: raw.max_seeding_time,
  name: raw.name,
  num_complete: raw.num_complete,
  num_incomplete: raw.num_incomplete,
  num_leechs: raw.num_leechs,
  num_seeds: raw.num_seeds,
  priority: raw.priority,
  progress: raw.progress,
  ratio: raw.ratio,
  ratio_limit: raw.ratio_limit,
  save_path: raw.save_path,
  seeding_time: raw.seeding_time,
  seeding_time_limit: raw.seeding_time_limit,
  seen_complete: raw.seen_complete,
  seq_dl: raw.seq_dl,
  size: raw.size,
  state: raw.state,
  super_seeding: raw.super_seeding,
  tags: normalizeTags(raw.tags),
  time_active: raw.time_active,
  total_size: raw.total_size,
  tracker: raw.tracker,
  up_limit: raw.up_limit,
  uploaded: raw.uploaded,
  uploaded_session: raw.uploaded_session,
  upspeed: raw.upspeed,
});
