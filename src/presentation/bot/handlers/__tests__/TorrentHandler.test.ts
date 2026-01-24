import type { Bot } from 'grammy';
import type { Message } from 'grammy/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TorrentService } from '../../../domain/services/TorrentService.js';
import type { ChatSettingsRepository } from '../../../infrastructure/persistence/repositories/ChatSettingsRepository.js';
import type { MyContext } from '../../../shared/context.js';
import type { Logger } from '../../../shared/utils/logger.js';
import { TorrentHandler } from '../TorrentHandler.js';

describe('TorrentHandler unit tests', () => {
  let mockTorrentService: TorrentService;
  let mockLogger: Logger;
  let mockChatSettings: ChatSettingsRepository;
  let mockChatMessageState: any;
  let mockBot: Bot<MyContext> | undefined;
  let handler: TorrentHandler;
  let ctx: MyContext;
  let mockMessage: Message;
  let chatId: number;

  beforeEach(() => {
    chatId = 42;
    mockTorrentService = {
      downloadTorrentFile: vi.fn(),
      addTorrent: vi.fn(),
      removeTorrentByUid: vi.fn(),
      getTorrentMetasByChatId: vi.fn(),
      formatBytes: vi.fn((bytes) => `${bytes}B`),
      formatDuration: vi.fn((seconds) => `${seconds}m`),
    } as unknown as TorrentService;

    mockLogger = { error: vi.fn() } as unknown as Logger;

    mockChatSettings = {
      getLocale: vi.fn(),
    } as unknown as ChatSettingsRepository;

    mockChatMessageState = {
      getMessageState: vi.fn(),
      saveMessageState: vi.fn(),
      deleteMessageState: vi.fn(),
      getAllActiveTorrentProgressMessages: vi.fn().mockResolvedValue([]),
      cleanupExpiredMessages: vi.fn().mockResolvedValue(0),
    };

    mockBot = {} as Bot<MyContext> | undefined;

    mockMessage = {
      chat: { id: chatId },
      message_id: 123,
      text: '',
    } as unknown as Message;

    ctx = {
      message: mockMessage,
      reply: vi.fn(),
      t: vi.fn((k) => k) as any,
    } as unknown as MyContext;
    (ctx as any).chatId = chatId;

    handler = new TorrentHandler({
      torrentService: mockTorrentService as TorrentService,
      logger: mockLogger as Logger,
      searchEngines: [],
      bot: mockBot,
      chatSettingsRepository: mockChatSettings,
      chatMessageStateRepository: mockChatMessageState,
    });

    // ensure ctx has callback helper by default
    (ctx as any).answerCallbackQuery = vi.fn();
    // default getTorrentMetasByChatId to avoid undefined in createOrUpdateTorrentsMessage
    (mockTorrentService as any).getTorrentMetasByChatId = vi
      .fn()
      .mockResolvedValue([]);
    (mockTorrentService as any).getTorrentsByHash = vi
      .fn()
      .mockResolvedValue([]);
  });

  describe('handleDownloadCommand (private method)', () => {
    it('downloads and adds torrent successfully', async () => {
      (ctx.message as any).text = '/dl_engine_id_123';
      mockTorrentService.downloadTorrentFile.mockResolvedValue({
        ok: true,
        value: 'torrentdata',
      });
      mockTorrentService.addTorrent.mockResolvedValue({
        ok: true,
        value: { hash: 'hash', added: true },
      });

      await (handler as any).handleDownloadCommand(ctx);

      expect(mockTorrentService.downloadTorrentFile).toHaveBeenCalled();
      expect(mockTorrentService.addTorrent).toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('replies error when download file fails', async () => {
      (ctx.message as any).text = '/dl_engine_id_123';
      mockTorrentService.downloadTorrentFile.mockResolvedValue({
        ok: false,
        error: new Error('download error'),
      });

      await (handler as any).handleDownloadCommand(ctx);

      expect(mockTorrentService.downloadTorrentFile).toHaveBeenCalled();
      expect(mockTorrentService.addTorrent).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('torrent-download-error');
    });

    it('replies error when add torrent fails', async () => {
      (ctx.message as any).text = '/dl_engine_id_123';
      mockTorrentService.downloadTorrentFile.mockResolvedValue({
        ok: true,
        value: 'torrentdata',
      });
      mockTorrentService.addTorrent.mockResolvedValue({
        ok: false,
        error: new Error('add error'),
      });

      await (handler as any).handleDownloadCommand(ctx);

      expect(mockTorrentService.downloadTorrentFile).toHaveBeenCalled();
      expect(mockTorrentService.addTorrent).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('torrent-download-error');
    });

    it('replies with existing torrent info when add returns added=false', async () => {
      (ctx.message as any).text = '/dl_engine_id_123';
      mockTorrentService.downloadTorrentFile.mockResolvedValue({
        ok: true,
        value: 'torrentdata',
      });
      mockTorrentService.addTorrent.mockResolvedValue({
        ok: true,
        value: { hash: 'abc123', added: false, existingMeta: { uid: 'engine_id_123' } },
      });

      await (handler as any).handleDownloadCommand(ctx);

      expect(mockTorrentService.downloadTorrentFile).toHaveBeenCalled();
      expect(mockTorrentService.addTorrent).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('torrent-already-exists');
    });

    it('adds chat to tracking and triggers progress update on success', async () => {
      (ctx.message as any).text = '/dl_engine_id_123';
      mockTorrentService.downloadTorrentFile.mockResolvedValue({
        ok: true,
        value: 'torrentdata',
      });
      mockTorrentService.addTorrent.mockResolvedValue({
        ok: true,
        value: { hash: 'hash', added: true },
      });
      mockTorrentService.getTorrentMetasByChatId.mockResolvedValue([
        { hash: 'hash', uid: 'engine_id_123' },
      ]);
      // ensure getTorrentsByHash returns pending torrent so createOrUpdateTorrentsMessage keeps chat tracked
      (mockTorrentService as any).getTorrentsByHash = vi
        .fn()
        .mockResolvedValue([
          {
            hash: 'hash',
            progress: 0.5,
            dlspeed: 100,
            eta: 123,
            name: 'test',
            num_seeds: 1,
            num_complete: 2,
            num_leechs: 3,
            size: 1000,
          },
        ]);

      await (handler as any).handleDownloadCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect((handler as any).chatTorrents.has(chatId)).toBe(true);
      // chatTorrents stores hashes from QBittorrent response, not uids
      expect((handler as any).chatTorrents.get(chatId)).toContain('hash');
    });
  });

  describe('handleRemoveCommand (private method)', () => {
    it('removes torrent and replies success', async () => {
      (ctx.message as any).text = '/rm_engine_id_123';
      mockTorrentService.removeTorrentByUid.mockResolvedValue('hash');
      mockTorrentService.getTorrentMetasByChatId.mockResolvedValue([]);

      await (handler as any).handleRemoveCommand(ctx);

      expect(mockTorrentService.removeTorrentByUid).toHaveBeenCalledWith(
        'engine_id_123',
      );
      expect(ctx.reply).toHaveBeenCalledWith('torrents-removed-success');
    });

    it('replies error when remove fails', async () => {
      (ctx.message as any).text = '/rm_engine_id_123';
      mockTorrentService.removeTorrentByUid.mockRejectedValue(
        new Error('remove error'),
      );

      await (handler as any).handleRemoveCommand(ctx);

      expect(mockTorrentService.removeTorrentByUid).toHaveBeenCalledWith(
        'engine_id_123',
      );
      expect(ctx.reply).toHaveBeenCalledWith('torrent-remove-error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('triggers progress update after removal', async () => {
      (ctx.message as any).text = '/rm_engine_id_123';
      mockTorrentService.removeTorrentByUid.mockResolvedValue('hash');
      mockTorrentService.getTorrentMetasByChatId.mockResolvedValue([
        { hash: 'hash2', uid: 'engine_id_456' },
      ]);

      // ensure getTorrentsByHash returns a pending torrent so createOrUpdateTorrentsMessage will add the chat
      (mockTorrentService as any).getTorrentsByHash = vi
        .fn()
        .mockResolvedValue([
          {
            hash: 'hash2',
            progress: 0.5,
            dlspeed: 100,
            eta: 123,
            name: 'test',
            num_seeds: 1,
            num_complete: 2,
            num_leechs: 3,
            size: 1000,
          },
        ]);

      await (handler as any).handleRemoveCommand(ctx);

      expect((handler as any).chatTorrents.has(chatId)).toBe(true);
    });
  });

  describe('handleTorrentRemove (private callback method)', () => {
    it('removes torrent and answers callback on success', async () => {
      mockTorrentService.removeTorrentByUid.mockResolvedValue('hash');
      mockTorrentService.getTorrentMetasByChatId.mockResolvedValue([]);

      ctx.callbackQuery = { data: 'torrents:remove:engine_id_123:1' } as any;
      (ctx as any).answerCallbackQuery = vi.fn();

      await (handler as any).handleTorrentRemove(ctx, 'engine_id_123', 1);

      expect(mockTorrentService.removeTorrentByUid).toHaveBeenCalledWith(
        'engine_id_123',
      );
      expect((ctx as any).answerCallbackQuery).toHaveBeenCalledWith({
        text: 'torrents-removed-success',
      });
    });

    it('replies error on callback when remove fails', async () => {
      mockTorrentService.removeTorrentByUid.mockRejectedValue(
        new Error('remove error'),
      );

      ctx.callbackQuery = { data: 'torrents:remove:engine_id_123:1' } as any;
      (ctx as any).answerCallbackQuery = vi.fn();

      await (handler as any).handleTorrentRemove(ctx, 'engine_id_123', 1);

      expect(mockTorrentService.removeTorrentByUid).toHaveBeenCalledWith(
        'engine_id_123',
      );
      expect((ctx as any).answerCallbackQuery).toHaveBeenCalledWith({
        text: 'torrents-removed-error',
      });
    });

    it('triggers progress update after removal', async () => {
      mockTorrentService.removeTorrentByUid.mockResolvedValue('hash');
      mockTorrentService.getTorrentMetasByChatId.mockResolvedValue([
        { hash: 'hash2', uid: 'engine_id_456' },
      ]);

      // ensure getTorrentsByHash returns a pending torrent so createOrUpdateTorrentsMessage will add the chat
      (mockTorrentService as any).getTorrentsByHash = vi
        .fn()
        .mockResolvedValue([
          {
            hash: 'hash2',
            progress: 0.5,
            dlspeed: 100,
            eta: 123,
            name: 'test',
            num_seeds: 1,
            num_complete: 2,
            num_leechs: 3,
            size: 1000,
          },
        ]);

      ctx.callbackQuery = { data: 'torrents:remove:engine_id_123:1' } as any;

      const spy = vi.spyOn(handler as any, 'createOrUpdateTorrentsMessage');

      await (handler as any).handleTorrentRemove(ctx, 'engine_id_123', 1);

      expect((handler as any).chatTorrents.has(chatId)).toBe(true);
      expect(spy).toHaveBeenCalledWith(chatId, true);
      spy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('clears interval when disposed', () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

      handler.dispose();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
