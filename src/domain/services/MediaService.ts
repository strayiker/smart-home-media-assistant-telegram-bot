import type { FileTypeResult } from 'file-type';
import { fileTypeFromFile } from 'file-type';
import ffmpeg, { type FfprobeData } from 'fluent-ffmpeg';

import type { Logger } from '../../utils/Logger.js';

/**
 * Video bitrate limits by resolution (kbps).
 * Format: [[width, bitrate]]
 */
const VIDEO_BITRATES = [
  [360, 1200],
  [480, 1800],
  [720, 2400],
  [1080, 4800],
  [1440, 7000],
  [2160, 9600],
] as const;

/**
 * Supported video extensions.
 */
const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'avi'] as const;

export interface MediaServiceOptions {
  logger: Logger;
}

export class MediaService {
  private logger: Logger;

  constructor(options: MediaServiceOptions) {
    this.logger = options.logger;
  }

  /**
   * Check if file is a video based on extension.
   */
  isVideo(filename?: string): boolean {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext as never);
  }

  /**
   * Get video bitrate limit for a given resolution.
   */
  getMaxBitrateForResolution(width: number): number {
    for (const [resolution, bitrate] of VIDEO_BITRATES) {
      if (width <= resolution) return bitrate;
    }
    return VIDEO_BITRATES.at(-1)[1];
  }

  /**
   * Transcode video to fit within Telegram limits.
   * Reduces bitrate if needed, keeps audio.
   */
  async transcodeVideo(
    inputPath: string,
    outputPath: string,
  ): Promise<{ success: boolean; originalSize: number; newSize: number }> {
    this.logger.debug({ inputPath, outputPath }, 'Starting video transcoding');

    try {
      // Get video metadata first
      const metadata = await this.getVideoMetadata(inputPath);
      if (!metadata || !metadata.streams) {
        throw new Error('Failed to get video metadata');
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === 'video',
      );
      if (!videoStream || videoStream.width === undefined) {
        throw new Error('No video stream found');
      }

      const maxBitrate = this.getMaxBitrateForResolution(videoStream.width);
      const bitrateCmd = `maxrate=${maxBitrate}k`;

      // Get original file size
      const { size: originalSize } = await this.getFileSize(inputPath);

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size('?x720') // Resize to 720p max
          .videoBitrate(bitrateCmd)
          .output(outputPath)
          .on('end', () => {
            this.logger.info(
              { inputPath, outputPath },
              'Video transcoding completed successfully',
            );
            this.getFileSize(outputPath).then(({ size: newSize }) => {
              resolve({ success: true, originalSize, newSize });
            });
          })
          .on('error', (err) => {
            this.logger.error(
              { error: err, inputPath, outputPath },
              'Video transcoding failed',
            );
            reject(err);
          });
      });
    } catch (error) {
      this.logger.error({ error }, 'Video transcoding error');
      throw error;
    }
  }

  /**
   * Generate a thumbnail from video.
   * Takes frame at timestamp +10%.
   */
  async generateThumbnail(
    videoPath: string,
    outputPath: string,
  ): Promise<void> {
    this.logger.debug({ videoPath, outputPath }, 'Generating thumbnail');

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: 1,
          folder: outputPath.replace(/\/[^/]+$/, ''),
          filename: outputPath.split('/').pop(),
          size: '320x?',
          timemarks: ['10%'],
        })
        .on('end', () => {
          this.logger.info(
            { videoPath, outputPath },
            'Thumbnail generated successfully',
          );
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(
            { error: err, videoPath },
            'Thumbnail generation failed',
          );
          reject(err);
        });
    });
  }

  /**
   * Generate a short preview clip from video.
   * Creates 5-second clip from the middle of the video.
   */
  async generatePreview(videoPath: string, outputPath: string): Promise<void> {
    this.logger.debug({ videoPath, outputPath }, 'Generating preview');

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setStartTime('00:00:05') // Start at 5 seconds
        .setDuration('00:00:05') // 5 seconds duration
        .output(outputPath)
        .on('end', () => {
          this.logger.info(
            { videoPath, outputPath },
            'Preview generated successfully',
          );
          resolve();
        })
        .on('error', (err) => {
          this.logger.error(
            { error: err, videoPath },
            'Preview generation failed',
          );
          reject(err);
        });
    });
  }

  /**
   * Detect file type from file path.
   */
  async getFileType(filePath: string): Promise<FileTypeResult | undefined> {
    return await fileTypeFromFile(filePath);
  }

  /**
   * Get video metadata using ffprobe.
   */
  async getVideoMetadata(
    videoPath: string,
  ): Promise<FfprobeData | undefined> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          this.logger.warn(
            { error: err, videoPath },
            'Failed to get video metadata',
          );
          // eslint-disable-next-line unicorn/no-useless-undefined
          resolve(undefined);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Get file size in bytes.
   */
  private async getFileSize(filePath: string): Promise<{ size: number }> {
    return new Promise((resolve, reject) => {
      import('node:fs').then((fs) => {
        fs.stat(filePath, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            resolve({ size: stats.size });
          }
        });
      });
    });
  }
}
