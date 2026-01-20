import { logger } from './logger.js';
import { loadConfig } from './config/env.schema.js';
import { InMemorySessionStore } from './infrastructure/session/InMemorySessionStore.js';
import { SearchHandler } from './presentation/bot/handlers/SearchHandler.js';
import { SearchService } from './domain/services/SearchService.js';
import type { Logger as PinoLogger } from 'pino';
import { TorrentHandler } from './presentation/bot/handlers/TorrentHandler.js';
import { TorrentService } from './domain/services/TorrentService.js';
import { FileHandler } from './presentation/bot/handlers/FileHandler.js';
import { FileService } from './domain/services/FileService.js';
import { DownloadHandler } from './presentation/bot/handlers/DownloadHandler.js';
import { TorrentService } from './domain/services/TorrentService.js';
import { MediaHandler } from './presentation/bot/handlers/MediaHandler.js';
import { FeatureFlagService } from './domain/services/FeatureFlagService.js';
import { InMemoryFeatureFlagStore } from './infrastructure/featureFlags/InMemoryFeatureFlagStore.js';

// Lightweight DI container to avoid external dependency on tsyringe.
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
		// Check if there's a factory for this key
		if (factories.has(key)) {
			const factory = factories.get(key)!;
			const instance = factory();
			return instance as T;
		}
		// Otherwise, look for a registered instance
		if (!registry.has(key)) {
			throw new Error(`Dependency not found in container: ${String(key)}`);
		}
		return registry.get(key) as T;
	},
};

// Register Logger
container.registerInstance('Logger', logger);

// Register AppConfig from validated env
try {
	const appConfig = loadConfig();
	container.registerInstance('AppConfig', appConfig);
} catch (err) {
	// If config fails to load, keep process.env as fallback to avoid breaking edits.
	// Real startup validation happens in src/index.ts; this is a defensive registration.
	// eslint-disable-next-line no-console
	console.warn('AppConfig validation failed in DI registration; using process.env as fallback');
	container.registerInstance('AppConfig', process.env);
}

// Register ChatSessionService (in-memory by default)
// Use SQLite-backed session store by default (falls back to in-memory when adapter not provided)
import { SQLiteSessionStore } from './infrastructure/session/SQLiteSessionStore.js';
container.registerInstance('ChatSessionService', new SQLiteSessionStore());

// Register SearchHandler factory (will resolve SearchService and Logger lazily)
container.registerFactory('SearchHandler', () => {
		const svc = container.resolve<SearchService>('SearchService');
		const log = container.resolve<PinoLogger>('Logger');
		return new SearchHandler({ searchService: svc, logger: log });
});

container.registerFactory('TorrentHandler', () => {
		const svc = container.resolve<TorrentService>('TorrentService');
		const log = container.resolve<PinoLogger>('Logger');
		const engines = container.resolve<any>('SearchEngines');
		return new TorrentHandler({ torrentService: svc, logger: log, searchEngines: engines as any[] });
});

container.registerFactory('FileHandler', () => {
	const svc = container.resolve<FileService>('FileService');
	const log = container.resolve<PinoLogger>('Logger');
	return new FileHandler({ fileService: svc, logger: log });
});

container.registerFactory('DownloadHandler', () => {
	const fileSvc = container.resolve<FileService>('FileService');
	const torrentSvc = container.resolve<TorrentService>('TorrentService');
	const log = container.resolve<PinoLogger>('Logger');
	return new DownloadHandler({ fileService: fileSvc, torrentService: torrentSvc, logger: log });
});

container.registerFactory('MediaHandler', () => {
	const torrentSvc = container.resolve<TorrentService>('TorrentService');
	const log = container.resolve<PinoLogger>('Logger');
	return new MediaHandler({ torrentService: torrentSvc, logger: log });
});

// Feature flags (in-memory default)
container.registerInstance('FeatureFlagStore', new InMemoryFeatureFlagStore());
container.registerInstance('FeatureFlagService', new FeatureFlagService(container.resolve('FeatureFlagStore') as any));

// Usage examples (replace with proper types when available):
// import { container } from './di.js';
// const logger = container.resolve('Logger');
