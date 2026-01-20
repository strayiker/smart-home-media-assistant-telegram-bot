# Code Architecture Review & Analysis

**Document Version:** 1.0  
**Date:** January 2026  
**Reviewer Role:** Senior Architect

---

## Project Overview

**Project**: Smart Home Media Assistant Telegram Bot  
**Type**: Node.js / TypeScript Telegram Bot + Media Manager  
**Size**: ~2400 LOC (production code)  
**Purpose**: Search torrents on Rutracker, download via qBittorrent, share files via Telegram  
**Status**: Functional, ready for modernization  

---

## Architecture Analysis

### 1. Current Architecture Patterns

#### ✅ Positive Patterns

**Composer Pattern (grammy)**
```typescript
export class AuthComposer extends Composer<MyContext> {
  constructor(em: EntityManager, secretKey: string) {
    super();
    this.on('message::text', async (ctx) => {
      // Handle auth
    });
  }
}
```
- **Good**: Clean separation of command handlers
- **Usage**: Used for AuthComposer, TorrentsComposer
- **Issue**: One composer handling too many concerns

**Repository Pattern (Partial)**
```typescript
export class TorrentMetaRepository {
  constructor(private em: EntityManager) {}
  
  async findByUid(uid: string) {
    return this.em.findOne(TorrentMeta, { uid });
  }
}
```
- **Good**: Database access abstraction
- **Issue**: Only partially implemented; not all data access follows this pattern

**Entity Models (MikroORM)**
```typescript
@Entity()
export class TorrentMeta {
  @PrimaryKey()
  id!: number;

  @Property()
  uid!: string;
  // ...
}
```
- **Good**: Clear data modeling
- **Issue**: Entity behavior logic mixing with persistence

#### ❌ Anti-Patterns

**Monolithic Composers**
```typescript
// TorrentsComposer.ts: 997 LINES!
export class TorrentsComposer extends Composer<MyContext> {
  // Handles: search, download, file management, compression, metadata
  // Methods: handleSearchCommand(), handleDownloadCommand(), 
  //          formatTorrent(), createOrUpdateTorrentsMessages(),
  //          compressVideo(), and 50+ more...
}
```

**Issues**:
- Single Responsibility Principle violation
- Impossible to unit test individual features
- Hard to understand flow
- Difficult to maintain or extend
- Memory leaks with `chatMessages` and `chatTorrents` maps

**In-Memory State Management**
```typescript
private chatMessages = new Map<number, Message>();
private chatTorrents = new Map<number, Set<string>>();
private timeout: NodeJS.Timeout;

// Memory grows indefinitely - never cleaned up
// No persistence - lost on restart
```

**Tight Coupling**
```typescript
// index.ts - Creates all dependencies manually
const qBittorrent = new QBittorrentClient({...});
const authComposer = new AuthComposer(orm.em.fork(), secretKey);
const torrentsComposer = new TorrentsComposer({
  bot, em, qBittorrent, logger, // ...
});
```

**Magic Strings for Commands**
```typescript
if (ctx.message.text?.startsWith('/dl_')) {
  // Handle download
} else if (ctx.message.text?.startsWith('/ls_')) {
  // Handle list files
}
// Hard to maintain command registry
```

**No Error Boundaries**
```typescript
bot.catch(({ error }) => {
  if (error instanceof GrammyError) {
    logger.error(error, 'Error in request');
  } else if (error instanceof HttpError) {
    logger.error(error, 'Could not contact Telegram');
  } else {
    logger.error(error, 'Unknown error');
  }
});
// Generic error handling - no recovery strategy
```

**Unvalidated External Data**
```typescript
// From config.ts - no validation
export const botToken = config.get('BOT_TOKEN', {
  required: true,
});

// At startup - if BOT_TOKEN is invalid, fails at first API call
// Should validate immediately
```

---

### 2. Code Organization Review

#### Current Structure
```
src/
├── composers/          # Bot command handlers
│   ├── AuthComposer.ts (165 lines)
│   └── TorrentsComposer.ts (997 lines) ⚠️ TOO BIG
├── entities/          # Database models
│   ├── User.ts
│   ├── ChatSettings.ts
│   └── TorrentMeta.ts
├── qBittorrent/       # qBittorrent client
│   ├── QBittorrentClient.ts (314 lines)
│   ├── models.ts
│   └── types.ts
├── searchEngines/     # Search implementations
│   ├── SearchEngine.ts (abstract)
│   └── RutrackerSearchEngine.ts
├── utils/             # Grab bag of utilities ⚠️ MIXED CONCERNS
│   ├── ChatSettingsRepository.ts
│   ├── TorrentMetaRepository.ts
│   ├── CookieStorage.ts
│   ├── Config.ts, ConfigEnv.ts
│   ├── Logger.ts, RpcClient.ts
│   ├── formatBytes.ts, formatDuration.ts
│   └── types.ts
├── migrations/        # Database migrations
├── config.ts          # Environment config (no validation)
├── Context.ts         # grammy context type
├── logger.ts          # Pino logger instance
├── orm.ts             # MikroORM setup
├── fluent.ts          # i18n setup
├── dayjs.ts           # dayjs config
└── index.ts           # Bootstrap (123 lines)
```

**Issues**:
- `utils/` is a dumping ground (15+ mixed responsibilities)
- Repositories should be in domain layer, not utils
- No clear separation between domain logic and presentation
- No dedicated folder structure for features
- Config spread across multiple files

#### Recommended Structure (from PRD)
```
src/
├── domain/           # Core business logic
├── infrastructure/   # Framework integration
├── presentation/     # Bot handlers, formatters
├── shared/          # Shared utilities
├── config/          # Configuration
├── di.ts            # DI setup
└── index.ts         # Entry point
```

---

### 3. Type Safety Analysis

#### ✅ Good Type Safety
- Used throughout codebase
- Proper interface definitions
- Generic types where appropriate

#### ❌ Type Safety Gaps

**Unvalidated Config**
```typescript
// config.ts
export const botToken = config.get('BOT_TOKEN', { required: true });
// Returns any if validation fails - type is string but no guarantee
```

**Loose Typing on External APIs**
```typescript
// QBittorrentClient - responses not fully typed
const response = await fetch(url);
const data = await response.json(); // any type
// Should use Zod schema for validation
```

**Missing Return Types**
```typescript
// Some methods have implicit any returns
async createOrUpdateTorrentsMessage(chatId: number) {
  // Should have explicit return type
}
```

**Recommendation**: Enable stricter TypeScript config
```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitAny": true,
    "noImplicitThis": true
  }
}
```

---

### 4. File-by-File Analysis

#### src/index.ts (123 lines) ✅ GOOD
```typescript
// Responsibilities: Bootstrap bot, setup middleware, error handling
// Size: Appropriate for main entry point
// Issues: Could extract DI setup to separate file
// Grade: B+
```

#### src/config.ts (54 lines) ⚠️ NEEDS VALIDATION
```typescript
// Issues:
// 1. No validation of values at startup
// 2. Hard to see all required env vars at a glance
// 3. No typed config object

// Recommendation: Add Zod schema
export const configSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  SECRET_KEY: z.string().min(32),
  // ...
});

export type Config = z.infer<typeof configSchema>;
export const config = configSchema.parse(process.env);
```

#### src/composers/AuthComposer.ts (165 lines) ✅ GOOD
```typescript
// Responsibilities: Handle auth-related commands
// Size: Reasonable
// Issues: None major
// Grade: B+
```

#### src/composers/TorrentsComposer.ts (997 lines) ❌ CRITICAL
```typescript
// Responsibilities: 
//   - Search torrents (100+ lines)
//   - Download torrents (150+ lines)
//   - Manage downloads (200+ lines)
//   - Manage files (150+ lines)
//   - Video compression (150+ lines)
//   - Message formatting (150+ lines)
//   - In-memory state management (50+ lines)
//   - All utilities and helpers mixed in

// Issues:
// 1. Single Responsibility Principle VIOLATED
// 2. Impossible to unit test
// 3. 50+ private methods (untestable)
// 4. Circular dependencies
// 5. Hard to find specific functionality
// 6. Memory leaks with Maps

// Recommendation: Split into handlers
// - SearchHandler (150 lines) - search and format results
// - TorrentHandler (200 lines) - add/remove torrents, show status
// - FileHandler (150 lines) - list files, download files
// - DownloadHandler (200 lines) - manage active downloads
// - MediaHandler (100 lines) - video compression

// Grade: D- (Needs immediate refactoring)
```

**Problematic Code in TorrentsComposer**:

```typescript
// 1. In-memory leaks
private timeout: NodeJS.Timeout;

constructor(options: TorrentComposerOptions) {
  // ...
  this.timeout = setInterval(() => {
    this.createOrUpdateTorrentsMessages();
  }, 5 * 1000);
}

// Never cleaned up - leaks memory
// No session cleanup - maps grow forever
```

```typescript
// 2. Untestable video compression logic
private async compressVideo(
  ctx: MyContext,
  inputPath: string,
  maxBitrate: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(
        `-c:v libx264`,
        `-preset faster`,
        `-b:v ${maxBitrate}k`,
        `-maxrate ${Math.round(maxBitrate * 1.5)}k`,
        `-bufsize ${maxBitrate * 2}k`,
        `-c:a aac`,
        `-b:a 192k`,
      )
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}
// Tightly coupled to ffmpeg library
// Hard to mock for testing
// No error recovery
```

```typescript
// 3. Magic command parsing
if (ctx.message.text?.startsWith('/dl_')) {
  const uid = ctx.message.text.slice(4);
  // Magic string parsing - easy to break
  // No centralized command registry
}
```

---

### 5. Database Layer Analysis

#### MikroORM Setup ✅ GOOD
```typescript
// orm.ts - Clean setup
export const orm = new MikroORM<DbDriver>(
  ormConfig(
    path.resolve('./dist/entities'),
    path.resolve('./dist/migrations'),
  ),
);
```

#### Entities ✅ MOSTLY GOOD
```typescript
// Entities are well-defined
@Entity()
export class User {
  @PrimaryKey() id!: number;
  @Property() telegramId!: number;
  @Property({ onCreate: () => new Date() }) createdAt!: Date;
}
```

**Issue**: Missing relationships and constraints
```typescript
// Should have:
@Entity()
export class ChatSettings {
  @PrimaryKey() id!: number;
  
  @Property() chatId!: number;
  @Property() locale!: string;
  
  // Missing: Unique constraint on chatId
  // Missing: Relationship to User
  @ManyToOne()
  user!: User;
}
```

#### Repositories ⚠️ PARTIAL
```typescript
// Repositories exist but inconsistently
// Some repositories: TorrentMetaRepository, ChatSettingsRepository
// But many data access calls are direct:

// Direct query in composer
const chatSettings = await em.findOne(ChatSettings, { chatId });

// Should be:
const chatSettings = await chatSettingsRepository.findByChat(chatId);
```

---

### 6. Testing Review

#### Test Coverage: 0% ❌ CRITICAL
- No unit tests
- No integration tests
- No E2E tests
- No test infrastructure

**Recommendation**: Implement vitest + testing strategy (from PRD)

---

### 7. Error Handling Review

#### Current Approach: Try/Catch
```typescript
bot.catch(({ error }) => {
  if (error instanceof GrammyError) {
    logger.error(error, 'Error in request');
  } else if (error instanceof HttpError) {
    logger.error(error, 'Could not contact Telegram');
  }
});
```

#### Issues:
- Generic error messages
- No context about what operation failed
- No recovery strategy
- User sees generic "error occurred"
- Hard to debug

#### Recommended Approach: Result Type
```typescript
type Result<T, E> = Ok<T> | Err<E>;

async addTorrent(torrentData: Buffer): Promise<Result<Torrent, TorrentError>> {
  const parseResult = parseTorrent(torrentData);
  if (!parseResult.isOk()) {
    return err(new InvalidTorrentError(parseResult.error));
  }
  
  const qbtResult = await this.qbittorrent.add(parseResult.value);
  if (!qbtResult.isOk()) {
    return err(new QBittorentError(qbtResult.error));
  }
  
  return ok(qbtResult.value);
}
```

---

### 8. Logging Analysis

#### Current: Pino Logger ✅ GOOD
```typescript
// logger.ts
export const logger = pino();

// Usage
logger.info('Bot is running!');
logger.error(error, 'Error in request');
```

#### Issues:
- No request/response logging
- No structured field logging
- No trace IDs for debugging
- No performance metrics

#### Recommendations:
1. Add pino-http middleware
2. Add trace IDs to contexts
3. Add performance metrics
4. Structured field logging

```typescript
// Example improved logging
logger.info(
  {
    chatId: ctx.chatId,
    command: '/search',
    durationMs: performance.now() - start,
    resultCount: results.length,
  },
  'Torrent search completed'
);
```

---

### 9. Configuration Management

#### Current Approach: Direct Exports ⚠️
```typescript
export const botToken = config.get('BOT_TOKEN', { required: true });
export const secretKey = config.get('SECRET_KEY', { required: true });
// ... 10+ more exports
```

#### Issues:
- No validation (get() can fail at runtime)
- Hard to see all config at once
- No TypeScript types
- Config scattered across multiple calls

#### Recommended Approach: Single Typed Config
```typescript
// config/env.schema.ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN required'),
  SECRET_KEY: z.string().min(32, 'SECRET_KEY must be at least 32 chars'),
  BOT_API_ADDRESS: z.string().url(),
  QBT_WEB_UI_ADDRESS: z.string().url(),
  // ... all other config
});

export type AppConfig = z.infer<typeof envSchema>;

// config/app.config.ts
export const appConfig: AppConfig = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  BOT_TOKEN: process.env.BOT_TOKEN,
  // ...
});
```

---

### 10. Dependency Injection Review

#### Current Approach: Manual Wiring ⚠️
```typescript
// index.ts - manual dependency creation
const qBittorrent = new QBittorrentClient({
  url: qbtWebuiAddress,
  username: qbtWebuiUsername,
  password: qbtWebuiPassword,
  savePath: qbtSavePath,
});

const authComposer = new AuthComposer(orm.em.fork(), secretKey);

const torrentsComposer = new TorrentsComposer({
  bot,
  dataPath: botDataTorrentsPath,
  em: orm.em.fork(),
  searchEngines: [
    new RutrackerSearchEngine({
      username: rutrackerUsername,
      password: rutrackerPassword,
      cookieStorage,
      logger,
    }),
  ],
  qBittorrent,
  logger,
});
```

#### Issues:
- Hard to test (need to inject mocks)
- Difficult to add new dependencies
- Easy to forget to pass a dependency
- No centralized dependency graph

#### Recommended Approach: IoC Container
```typescript
// di.ts
import 'reflect-metadata';
import { container, injectable } from 'tsyringe';

container.register('AppConfig', { useValue: appConfig });
container.register('Logger', { useValue: logger });
container.register('ORM', { useValue: orm });

container.register(TorrentService, {
  useClass: TorrentService,
});

container.register(TorrentsHandler, {
  useClass: TorrentsHandler,
});

// index.ts
const handler = container.resolve(TorrentsHandler);
// All dependencies automatically injected
```

---

### 11. Search Engine Architecture

#### Current: Abstract Class ✅
```typescript
export abstract class SearchEngine {
  abstract name: string;
  abstract search(query: string): Promise<SearchResult[]>;
  abstract downloadTorrentFile(id: string): Promise<string>;
}

export class RutrackerSearchEngine extends SearchEngine {
  // Implementation
}
```

#### Good:
- Clear contract
- Easy to add new engines
- Used in TorrentsComposer

#### Issues:
- Not registered in IoC container
- Hard to extend or configure
- No error handling contract

#### Improved Design:
```typescript
// domain/search/SearchEngine.ts
export interface SearchEngine {
  readonly name: string;
  search(query: string): Promise<Result<SearchResult[], SearchError>>;
  downloadTorrentFile(id: string): Promise<Result<Buffer, SearchError>>;
}

// Plugin registry
export class SearchEngineRegistry {
  private engines = new Map<string, SearchEngine>();
  
  register(engine: SearchEngine) {
    this.engines.set(engine.name, engine);
  }
  
  searchAll(query: string): Promise<SearchResult[]> {
    // Search with all registered engines
  }
}
```

---

## Summary Table

| Aspect | Grade | Status | Priority |
|--------|-------|--------|----------|
| Project Structure | D+ | Needs reorganization | HIGH |
| TorrentsComposer Size | D- | Too large, needs split | CRITICAL |
| Type Safety | B- | Good but gaps | MEDIUM |
| Error Handling | D | Generic, no pattern | HIGH |
| Config Management | C | Works but not validated | MEDIUM |
| Testing | F | Zero tests | CRITICAL |
| Logging | B | Good but incomplete | LOW |
| DI Pattern | D | Manual wiring | HIGH |
| Database Layer | B | Good but partial | MEDIUM |
| Code Documentation | C | Minimal docs | MEDIUM |

---

## Critical Issues (Fix Immediately)

1. **TorrentsComposer 997 LOC** - Split into 5+ handlers
2. **In-Memory State Leaks** - Use persistent storage
3. **Zero Test Coverage** - Add vitest + first tests
4. **No Config Validation** - Add Zod schema
5. **No Dependency Injection** - Add tsyringe

---

## Recommended Reading

- [Clean Code: A Handbook of Agile Software Craftsmanship](https://www.oreilly.com/library/view/clean-code/9780136083238/)
- [Domain-Driven Design](https://www.oreilly.com/library/view/domain-driven-design/9780321125217/)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)

---

## Next Steps

1. Review this document with team
2. Approve PRD (PRD_ARCHITECTURE_REFACTORING.md)
3. Schedule refactoring sprint
4. Begin Phase 1: DI container setup
5. Implement validation layer
6. Add test infrastructure
