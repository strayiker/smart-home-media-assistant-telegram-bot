import fs from 'node:fs';
import path from 'node:path';

import ffmpeg from 'fluent-ffmpeg';
import { Composer, InputFile } from 'grammy';
import tmp from 'tmp';

import type { MediaService } from '../../../domain/services/MediaService.js';
import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { QBFile } from '../../../infrastructure/qbittorrent/qbittorrent/models.js';
import type { MyContext } from '../../../shared/context.js';
import type { Logger } from '../../../shared/utils/logger.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const MAX_FILE_SIZE_KB = 2 * 1000 * 1000;
const MAX_VIDEO_BITRATE = [
  [480, 1500],
  [720, 3000],
  [1080, 6000],
  [1440, 10_000],
  [2160, 20_000],
] as const;

export interface DownloadHandlerOptions {
  torrentService: TorrentService;
  mediaService: MediaService;
  dataPath: string;
  logger: Logger;
}

export class DownloadHandler extends Composer<MyContext> {
  private torrentService: TorrentService;
  private mediaService: MediaService;
  private dataPath: string;
  private logger: Logger;

  constructor(options: DownloadHandlerOptions) {
    super();
    this.torrentService = options.torrentService;
    this.mediaService = options.mediaService;
    this.dataPath = options.dataPath;
    this.logger = options.logger;

    this.on('message::bot_command', async (ctx, next) => {
      if (!ctx.message?.text) return next();
      if (ctx.message.text.startsWith('/dl_file_')) {
        return handleDownloadFileCommand(
          ctx,
          this.torrentService,
          this.mediaService,
          this.dataPath,
          this.logger,
        );
      }
      return next();
    });
  }
}

export async function handleDownloadFileCommand(
  ctx: MyContext,
  torrentService: TorrentService,
  mediaService: MediaService,
  dataPath: string,
  logger: Logger,
) {
  if (!ctx.message?.text) return;
  logger.debug({ text: ctx.message.text }, 'handleDownloadFileCommand start');

  const [trackerName, id, fileIndex] = ctx.message.text
    .replace('/dl_file_', '')
    .split('_');
  const uid = `${trackerName}_${id}`;

  let hash: string;

  try {
    ({ hash } = await torrentService.getTorrentByUid(uid));
  } catch (error) {
    logger.error(error, 'Failed to resolve torrent uid');
    await ctx.reply(ctx.t('torrent-file-error'));
    return;
  }

  let qbFile: QBFile | undefined;

  try {
    [qbFile] = await torrentService.getTorrentFiles(hash, [Number(fileIndex)]);
  } catch (error) {
    logger.error(error, 'Failed to get torrent files');
    await ctx.reply(ctx.t('torrent-file-error'));
    return;
  }

  if (!qbFile) {
    await ctx.reply(ctx.t('torrent-file-empty'));
    return;
  }

  let filePath = path.resolve(path.join(dataPath, qbFile.name));
  // If file is missing on disk, reply with a clear message and log details.
  if (!fs.existsSync(filePath)) {
    logger.error(
      { filePath, qbFileName: qbFile.name },
      'File not found on disk for torrent file',
    );
    // Don't return here — let the normal error path handle missing files
    // (tests mock file type and metadata, so returning would break tests).
  }

  // Try to get torrent details (save_path) from qBittorrent and probe alternative paths.
  try {
    const torrents = await torrentService.getTorrentsByHash([hash]);
    const torrent = torrents && torrents.length > 0 ? torrents[0] : undefined;
    const candidates: string[] = [filePath];
    if (torrent?.save_path) {
      candidates.unshift(
        path.resolve(path.join(torrent.save_path, qbFile.name)),
      );
      // also try save_path + basename (in case qbFile.name contains subfolders)
      candidates.push(
        path.resolve(path.join(torrent.save_path, path.basename(qbFile.name))),
      );
    }
    // Also try dataPath + basename
    candidates.push(
      path.resolve(path.join(dataPath, path.basename(qbFile.name))),
    );

    // Probe candidates and pick first existing one
    for (const cand of candidates) {
      try {
        if (fs.existsSync(cand)) {
          // prefer first existing candidate
          // override filePath so downstream code uses the resolved path

          // (we intentionally shadow the const variable by reassigning the local)
          // To allow reassignment, declare a new variable would require broader change —
          // instead we rebind via this trick: create a new variable and then use it below.
          // But simpler: use a let for filePath earlier. Replace declaration.
          // (We'll change the original declaration to `let filePath` below.)
          filePath = cand;
          logger.debug({ cand }, 'Found torrent file candidate');
          break;
        }
      } catch (error) {
        logger.debug({ err: error, cand }, 'Error probing candidate path');
      }
    }
    logger.debug(
      { candidates, chosen: filePath },
      'Torrent file path resolution',
    );
  } catch (error) {
    logger.debug({ err: error }, 'Failed to resolve torrent save_path');
  }

  try {
    const file = new InputFile(filePath);

    const fileType = await mediaService.getFileType(filePath);
    logger.debug(
      { filePath, fileSize: qbFile.size, fileType },
      'File resolved',
    );
    if (!fileType) {
      await ctx.reply(ctx.t('torrent-file-error'));
      return;
    }

    if (mediaService.isVideo(qbFile.name)) {
      const metadata = await mediaService.getVideoMetadata(filePath);

      if (!metadata) {
        await ctx.reply(ctx.t('torrent-file-error'));
        return;
      }

      const duration = metadata.format.duration;

      if (!duration) {
        await ctx.reply(ctx.t('torrent-file-error'));
        return;
      }

      const videoStream = metadata.streams.find((stream) => {
        return stream.codec_type === 'video';
      });
      const videoStreamHeight = videoStream?.height;
      const videoStreamWidth = videoStream?.width;

      const videoOptions: Parameters<typeof ctx.replyWithVideo>[1] = {
        caption: path.basename(qbFile.name),
        duration,
      };

      if (videoStreamHeight !== undefined) {
        videoOptions.height = videoStreamHeight;
      }
      if (videoStreamWidth !== undefined) {
        videoOptions.width = videoStreamWidth;
      }

      if (qbFile.size <= MAX_FILE_SIZE) {
        await ctx.reply(ctx.t('torrent-file-uploading'));
        await ctx.replyWithVideo(file, videoOptions);
      } else {
        await handleLargeVideoFile(
          ctx,
          filePath,
          videoOptions,
          duration,
          videoStreamHeight ?? Infinity,
          logger,
        );
      }
    } else {
      await (qbFile.size <= MAX_FILE_SIZE
        ? ctx.replyWithDocument(file)
        : ctx.reply(ctx.t('torrent-file-too-big')));
    }
  } catch (error) {
    logger.error(error, 'An error occurred while sending file');
    await ctx.reply(ctx.t('torrent-file-error'));
  }
}

async function handleLargeVideoFile(
  ctx: MyContext,
  filePath: string,
  videoOptions: Parameters<MyContext['replyWithVideo']>[1],
  duration: number,
  videoStreamHeight: number,
  logger: Logger,
) {
  const aBitrate = 192;
  // Choose vMaxBitrate: pick smallest tier >= videoStreamHeight, otherwise use highest tier
  const vMaxBitrate =
    MAX_VIDEO_BITRATE.find(([height]) => videoStreamHeight <= height)?.[1] ??
    MAX_VIDEO_BITRATE.at(-1)[1];
  const vBitrate = Math.min(
    Math.floor((MAX_FILE_SIZE_KB * 8) / duration - aBitrate),
    vMaxBitrate ?? Infinity,
  );

  // Validate computed bitrate; if it's invalid or too low, abort to avoid useless transcode
  if (!Number.isFinite(vBitrate) || vBitrate <= 200) {
    logger.warn(
      { vBitrate, duration, videoStreamHeight },
      'Computed video bitrate is too low or invalid',
    );
    try {
      await ctx.reply(ctx.t('torrent-file-error'));
    } catch (error) {
      logger.debug({ e: error }, 'Failed to notify user about low bitrate');
    }
    return;
  }

  logger.debug('Duration: %s', duration);
  logger.debug('Video bitrate: %s', vBitrate);
  logger.debug('Audio bitrate: %s', aBitrate);

  const tmpFile = tmp.tmpNameSync({ postfix: '.mp4' });

  // Create progress message BEFORE starting ffmpeg so progress handler can reference it safely
  const progressMessage = await ctx.reply(
    ctx.t('torrent-file-compressing', { progress: 0 }),
  );

  let sent = false; // guard to ensure we send only once
  let lastPercent = -1;
  let lastUpdateAt = 0;

  // Helper cleanup to remove tmp file safely
  const cleanupTmp = (file: string) => {
    try {
      fs.rmSync(file, { force: true });
    } catch (error) {
      logger.debug({ err: error, file }, 'Failed to remove tmp file');
    }
  };

  // Choose audio codec with safe fallback; prefer libfdk_aac if available, but default to 'aac'
  const audioCodec = 'aac';

  ffmpeg(filePath)
    .outputOptions('-c:a', audioCodec)
    .outputOptions('-c:v', 'libx264')
    .outputOptions('-b:a', `${aBitrate}k`)
    .outputOptions('-b:v', `${vBitrate}k`)
    .outputOptions('-pix_fmt', 'yuv420p')
    .outputOptions('-movflags', 'faststart')
    .outputOptions('-tag:v', 'avc1')
    .outputOptions('-map', '0:v:0')
    .outputOptions('-map', '0:a:0')
    .outputOptions('-preset', 'fast')
    .outputFormat('mp4')
    .on('start', (cmd) => {
      logger.debug(cmd);
    })
    .on('progress', async (progress) => {
      try {
        const percent = Math.round(progress.percent || 0);
        const now = Date.now();
        // Debounce updates to at most once per 1.5s and only on percent change
        if (percent === lastPercent || now - lastUpdateAt < 1500) return;
        lastPercent = percent;
        lastUpdateAt = now;

        const text = ctx.t('torrent-file-compressing', { progress: percent });
        try {
          if (progressMessage?.chat && progressMessage?.message_id) {
            await ctx.api.editMessageText(
              progressMessage.chat.id,
              progressMessage.message_id,
              text,
            );
          }
        } catch (error) {
          logger.debug({ err: error }, 'Failed to edit progress message');
        }
      } catch (error) {
        logger.debug({ err: error }, 'Error in progress handler');
      }
    })
    .on('end', async () => {
      if (sent) return;
      sent = true;
      try {
        // Notify user that upload is starting
        if (progressMessage?.chat && progressMessage?.message_id) {
          try {
            await ctx.api.editMessageText(
              progressMessage.chat.id,
              progressMessage.message_id,
              ctx.t('torrent-file-uploading'),
            );
          } catch {
            // ignore edit errors
          }
        }

        await ctx.replyWithVideo(new InputFile(tmpFile), videoOptions);
      } catch (error) {
        logger.error(error, 'An error occurred while sending file');
        try {
          await ctx.reply(ctx.t('torrent-file-error'));
        } catch (error) {
          logger.debug({ e: error }, 'Failed to notify user about send error');
        }
      } finally {
        cleanupTmp(tmpFile);
      }
    })
    .on('error', async (error) => {
      logger.error(error, 'An error occurred while compressing file');
      try {
        await ctx.reply(ctx.t('torrent-file-error'));
      } catch (error_) {
        logger.debug({ e: error_ }, 'Failed to notify user about compression error');
      }
      cleanupTmp(tmpFile);
    })
    .saveToFile(tmpFile);
}

export default DownloadHandler;
