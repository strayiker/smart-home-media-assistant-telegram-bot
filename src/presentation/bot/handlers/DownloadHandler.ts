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

  const filePath = path.resolve(path.join(dataPath, qbFile.name));

  try {
    const file = new InputFile(filePath);

    const fileType = await mediaService.getFileType(filePath);
    logger.debug({ filePath, fileSize: qbFile.size, fileType }, 'File resolved');
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
  const vMaxBitrate = MAX_VIDEO_BITRATE.find(
    ([height]) => height > videoStreamHeight,
  )?.[1];
  const vBitrate = Math.min(
    Math.floor((MAX_FILE_SIZE_KB * 8) / duration - aBitrate),
    vMaxBitrate ?? Infinity,
  );

  logger.debug('Duration: %s', duration);
  logger.debug('Video bitrate: %s', vBitrate);
  logger.debug('Audio bitrate: %s', aBitrate);

  const tmpFile = tmp.tmpNameSync({ postfix: '.mp4' });

  ffmpeg(filePath)
    .outputOptions('-c:a', 'libfdk_aac')
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
      const text = ctx.t('torrent-file-compressing', {
        progress: Math.round(progress.percent || 0),
      });
      if (text !== progressMessage.text) {
        try {
          await ctx.api.editMessageText(
            progressMessage.chat.id,
            progressMessage.message_id,
            text,
          );
          progressMessage.text = text;
        } catch {
          /* empty */
        }
      }
    })
    .on('end', async () => {
      try {
        await ctx.api.editMessageText(
          progressMessage.chat.id,
          progressMessage.message_id,
          ctx.t('torrent-file-uploading'),
        );
        await ctx.replyWithVideo(new InputFile(tmpFile), videoOptions);
      } catch (error) {
        logger.error(error, 'An error occurred while sending file');
      } finally {
        fs.rmSync(tmpFile, {
          force: true,
        });
      }
    })
    .on('error', (error) => {
      logger.error(error, 'An error occurred while sending file');
      fs.rmSync(tmpFile, {
        force: true,
      });
    })
    .saveToFile(tmpFile);

  const progressMessage = await ctx.reply(
    ctx.t('torrent-file-compressing', { progress: 0 }),
  );
}

export default DownloadHandler;
