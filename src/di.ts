import type { MikroORM } from '@mikro-orm/core';
import type { Bot } from 'grammy';
import type { Logger as PinoLogger } from 'pino';

import { loadConfig } from './config/envSchema.js';
import { AuthService } from './domain/services/AuthService.js';
import type { FeatureFlagStore } from './domain/services/FeatureFlagService.js';
import { FeatureFlagService } from './domain/services/FeatureFlagService.js';
import { type FileService } from './domain/services/FileService.js';
import { MediaService } from './domain/services/MediaService.js';
import { type SearchService } from './domain/services/SearchService.js';
import { type TorrentService } from './domain/services/TorrentService.js';
import { InMemoryFeatureFlagStore } from './infrastructure/featureFlags/InMemoryFeatureFlagStore.js';
import { ChatMessageStateRepository } from './infrastructure/persistence/repositories/ChatMessageStateRepository.js';
import type { ChatSettingsRepository } from './infrastructure/persistence/repositories/ChatSettingsRepository.js';
import { UserRepository } from './infrastructure/persistence/repositories/UserRepository.js';
import type { SearchEngine } from './infrastructure/searchEngines/searchEngines/searchEngine.js';
import { logger } from './logger.js';
// Lightweight DI container to avoid external dependency on tsyringe.
import { CommandsRegistry } from './presentation/bot/commandsRegistry.js';
import { DownloadHandler } from './presentation/bot/handlers/DownloadHandler.js';
import { FileHandler } from './presentation/bot/handlers/FileHandler.js';
import { MediaHandler } from './presentation/bot/handlers/MediaHandler.js';
import { SearchHandler } from './presentation/bot/handlers/SearchHandler.js';
import type { TorrentHandlerOptions } from './presentation/bot/handlers/TorrentHandler.js';
import { TorrentHandler } from './presentation/bot/handlers/TorrentHandler.js';
import type { MyContext } from './shared/context.js';

interface CommandProvider {
  getCommands?: () => Array<{
    command: string;
    descriptionKey: string;
    scope?: unknown;
  }>;
}
const registry = new Map<string | symbol, unknown>();
const factories = new Map<string | symbol, () => unknown>();

export const container = {
  registerInstance(key: string | symbol, value: unknown) {
    registry.set(key, value);
  },
  registerFactory(key: string | symbol, factory: () => unknown) {
    factories.set(key, factory);
  },
  resolve<T = unknown>(key: string | symbol): T {
    // Prefer registered instances so callers can override factories with singletons
    if (registry.has(key)) {
      return registry.get(key) as T;
    }
    // Otherwise, if there's a factory for this key, invoke it
    if (factories.has(key)) {
      const factory = factories.get(key)!;
      const instance = factory();
      return instance as T;
    }
    throw new Error(`Dependency not found in container: ${String(key)}`);
  },
};

// Register Logger
container.registerInstance('Logger', logger);

// Register AppConfig from validated env
try {
  const appConfig = loadConfig();
  container.registerInstance('AppConfig', appConfig);
} catch {
  // If config fails to load, keep process.env as fallback to avoid breaking edits.
  // Real startup validation happens in src/index.ts; this is a defensive registration.
  logger.warn(
    'AppConfig validation failed in DI registration; using process.env as fallback',
  );
  container.registerInstance('AppConfig', process.env);
}

// Register ChatSessionService (in-memory by default)
// Use SQLite-backed session store by default (falls back to in-memory when adapter not provided)
import { DbSessionStore } from './infrastructure/session/DbSessionStore.js';

// Register ChatSessionService as a factory so we can resolve the ORM at runtime
container.registerFactory('ChatSessionService', () => {
  const orm = container.resolve<MikroORM>('ORM');
  if (!orm) {
    throw new Error(
      'ORM not registered in container; ChatSessionService requires ORM to be available',
    );
  }
  // Use a forked EM for request safety
  return new DbSessionStore(orm.em.fork());
});

// Register SearchHandler factory (will resolve SearchService and Logger lazily)
container.registerFactory('SearchHandler', () => {
  const svc = container.resolve<SearchService>('SearchService');
  const log = container.resolve<PinoLogger>('Logger');
  const inst = new SearchHandler({ searchService: svc, logger: log });
  try {
    const registry = container.resolve<CommandsRegistry>('CommandsRegistry');
    const cmds = (inst as unknown as CommandProvider).getCommands?.() ?? [];
    for (const c of cmds) registry.register(c);
  } catch {
    // ignore
  }
  return inst;
});

container.registerFactory('TorrentHandler', () => {
  const svc = container.resolve<TorrentService>('TorrentService');
  const log = container.resolve<PinoLogger>('Logger');
  const engines = container.resolve<SearchEngine[]>('SearchEngines');
  // Resolve Bot and repositories; these must be registered in DI
  const bot = container.resolve<Bot<MyContext>>('Bot');
  const chatSettings = container.resolve<ChatSettingsRepository>('ChatSettingsRepository');
  const chatMessageState = container.resolve<ChatMessageStateRepository>('ChatMessageStateRepository');

  const options: TorrentHandlerOptions = {
    torrentService: svc,
    logger: log,
    searchEngines: engines,
    bot,
    chatSettingsRepository: chatSettings,
    chatMessageStateRepository: chatMessageState,
  };

  const inst = new TorrentHandler(options);
  try {
    const registry = container.resolve<CommandsRegistry>('CommandsRegistry');
    const cmds = (inst as unknown as CommandProvider).getCommands?.() ?? [];
    for (const c of cmds) registry.register(c);
  } catch {
    // ignore
  }
  return inst;
});

container.registerFactory('FileHandler', () => {
  const svc = container.resolve<FileService>('FileService');
  const log = container.resolve<PinoLogger>('Logger');
  const inst = new FileHandler({ fileService: svc, logger: log });
  try {
    const registry = container.resolve<CommandsRegistry>('CommandsRegistry');
    const cmds = (inst as unknown as CommandProvider).getCommands?.() ?? [];
    for (const c of cmds) registry.register(c);
  } catch {
    // ignore
  }
  return inst;
});

container.registerFactory('DownloadHandler', () => {
  const torrentSvc = container.resolve<TorrentService>('TorrentService');
  const mediaSvc = container.resolve<MediaService>('MediaService');
  const log = container.resolve<PinoLogger>('Logger');
  const inst = new DownloadHandler({
    torrentService: torrentSvc,
    mediaService: mediaSvc,
    dataPath: container.resolve<string>('BotDataPath'),
    logger: log,
  });
  try {
    const registry = container.resolve<CommandsRegistry>('CommandsRegistry');
    const cmds = (inst as unknown as CommandProvider).getCommands?.() ?? [];
    for (const c of cmds) registry.register(c);
  } catch {
    // ignore
  }
  return inst;
});

container.registerFactory('MediaService', () => {
  const log = container.resolve<PinoLogger>('Logger');
  return new MediaService({ logger: log });
});

container.registerFactory('MediaHandler', () => {
  const mediaSvc = container.resolve<MediaService>('MediaService');
  const log = container.resolve<PinoLogger>('Logger');
  const inst = new MediaHandler({ mediaService: mediaSvc, logger: log });
  try {
    const registry = container.resolve<CommandsRegistry>('CommandsRegistry');
    const cmds = (inst as unknown as CommandProvider).getCommands?.() ?? [];
    for (const c of cmds) registry.register(c);
  } catch {
    // ignore
  }
  return inst;
});

// UserRepository and AuthService
container.registerFactory('UserRepository', () => {
  const orm = container.resolve<MikroORM>('ORM');
  if (!orm) throw new Error('ORM not registered; UserRepository requires ORM');
  return new UserRepository(orm.em.fork());
});

container.registerFactory('ChatMessageStateRepository', () => {
  const orm = container.resolve<MikroORM>('ORM');
  if (!orm)
    throw new Error(
      'ORM not registered; ChatMessageStateRepository requires ORM',
    );
  return new ChatMessageStateRepository(orm.em.fork());
});

container.registerFactory('AuthService', () => {
  const repo = container.resolve<UserRepository>('UserRepository');
  const loggerInst = container.resolve<PinoLogger>('Logger');
  const appConfig = container.resolve<Record<string, unknown>>('AppConfig');
  const secretKey = ((): string => {
    const maybe = appConfig ?? {};
    if (typeof maybe.BOT_SECRET === 'string') return maybe.BOT_SECRET;
    if (typeof maybe.secretKey === 'string') return maybe.secretKey;
    if (typeof process.env.BOT_SECRET === 'string')
      return process.env.BOT_SECRET;
    if (typeof process.env.SECRET_KEY === 'string')
      return process.env.SECRET_KEY;
    return '';
  })();
  return new AuthService(repo, secretKey, loggerInst);
});

// Feature flags (in-memory default)
container.registerInstance('FeatureFlagStore', new InMemoryFeatureFlagStore());
container.registerInstance(
  'FeatureFlagService',
  new FeatureFlagService(
    container.resolve<FeatureFlagStore>('FeatureFlagStore'),
  ),
);

// Commands registry for aggregating bot commands
container.registerInstance('CommandsRegistry', new CommandsRegistry());

// Usage examples (replace with proper types when available):
// import { container } from './di.js';
// const logger = container.resolve('Logger');
