# Architecture Decision Records (ADRs)

**Purpose**: Document significant architectural decisions for the Smart Home Media Assistant Telegram Bot project.

**Format**: Following the Lightweight ADR format (based on Michael Nygard's template)

---

## ADR-0001: Use Dependency Injection Container (tsyringe)

**Date**: January 2026
**Status**: Proposed
**Author**: Technical Architecture Review

### Context

The current codebase manually creates and wires all dependencies in the main entry point (`index.ts`). This approach causes several problems:

1. **Testability Issues**: Hard to inject mock dependencies for unit tests
2. **Boilerplate**: 50+ lines of manual setup in index.ts
3. **Scalability**: Adding new services requires modifying index.ts
4. **Circular Dependencies**: Easy to create circular references without compile-time detection
5. **Single Responsibility**: Entry point handles both configuration AND dependency creation

### Decision

We will adopt **tsyringe** (TypeScript Dependency Injection Container) for automatic dependency resolution and injection.

### Rationale

**Why tsyringe over alternatives?**

| Criteria                  | tsyringe      | inversify       | awilix |
| ------------------------- | ------------- | --------------- | ------ |
| Bundle Size               | Small         | Large           | Medium |
| TypeScript Support        | Native        | Decorator-based | Good   |
| Learning Curve            | Shallow       | Steep           | Medium |
| ESM Support               | ✅            | ✅              | ✅     |
| Reflect-metadata Required | ✅ (optional) | ✅ (required)   | ❌     |

**Benefits**:

- Automatic dependency resolution at startup
- Type-safe injection with TypeScript
- Easy to mock for testing
- Follows industry standard patterns
- Minimal runtime overhead

### Implementation

```typescript
// di.ts
import 'reflect-metadata';
import { container, injectable, inject } from 'tsyringe';

// Register services
container.register('AppConfig', { useValue: appConfig });
container.register('Logger', { useValue: logger });

@injectable()
export class TorrentService {
  constructor(
    @inject('Logger') private logger: Logger,
    private repository: TorrentRepository,
  ) {}
}

// Auto-registration through decorators
container.register(TorrentService, { useClass: TorrentService });
```

### Consequences

**Positive**:

- ✅ Improved testability
- ✅ Reduced coupling
- ✅ Better code organization
- ✅ Easier to extend

**Negative**:

- ❌ Additional dependency (tsyringe)
- ❌ Requires reflect-metadata
- ❌ Slightly steeper learning curve for new developers

### Implementation Timeline

- Phase 1 (Week 1): Install and setup tsyringe
- Phase 2 (Weeks 3-4): Migrate services to use DI
- Phase 3 (Weeks 5-6): Convert all handlers to DI
- Phase 4 (Week 7): Remove manual wiring from index.ts

### References

- [tsyringe Documentation](https://github.com/microsoft/tsyringe)
- [Dependency Injection Pattern](https://refactoring.guru/design-patterns/dependency-injection)

---

## ADR-0002: Use Zod for Runtime Validation

**Date**: January 2026
**Status**: Proposed
**Author**: Technical Architecture Review

### Context

The application currently has no runtime validation layer for:

1. **Configuration**: Environment variables loaded without validation
2. **API Responses**: External API responses accepted without type checking
3. **User Input**: Telegram message data not validated against schema
4. **Database**: Entity relationships not validated at persistence layer

This creates several risks:

- Invalid configuration discovered at runtime (not startup)
- Type mismatches between TypeScript types and runtime data
- Silent data corruption from unexpected API formats
- Difficult debugging when assumptions about data shape are violated

### Decision

Adopt **Zod** for schema validation throughout the application:

- Configuration validation on startup
- API response validation for external services
- Database entity validation before persistence
- User input validation for bot commands

### Rationale

**Why Zod over alternatives?**

| Criteria           | zod               | joi        | yup     |
| ------------------ | ----------------- | ---------- | ------- |
| Bundle Size        | Small             | Large      | Medium  |
| TypeScript Support | Native (inferred) | Decorators | Okay    |
| Schema Composition | Excellent         | Good       | Good    |
| Error Messages     | Clear             | Very Clear | Clear   |
| ESM Support        | ✅                | ✅         | Limited |
| Learning Curve     | Shallow           | Medium     | Shallow |

**Benefits**:

- Type inference from schema (single source of truth)
- Composition and reusability
- Clear, actionable error messages
- No external dependencies
- Perfect for TypeScript projects

### Implementation

```typescript
// config/env.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('production'),
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  SECRET_KEY: z.string().min(32, 'SECRET_KEY must be at least 32 characters'),
  BOT_API_ADDRESS: z.string().url('Invalid BOT_API_ADDRESS URL'),
  QBT_WEB_UI_ADDRESS: z.string().url(),
  QBT_WEB_UI_USERNAME: z.string().min(1),
  QBT_WEB_UI_PASSWORD: z.string().min(1),
  RUTRACKER_USERNAME: z.string().min(1),
  RUTRACKER_PASSWORD: z.string().min(1),
  BOT_DATA_PATH: z.string().default('/data/bot'),
  BOT_DATA_TORRENTS_PATH: z.string().default('/data/torrents'),
  QBT_SAVE_PATH: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

// app.ts - Validate on startup
try {
  const config = envSchema.parse(process.env);
  logger.info('Configuration validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.fatal({ errors: error.errors }, 'Invalid configuration');
    process.exit(1);
  }
  throw error;
}
```

### Consequences

**Positive**:

- ✅ Fast feedback on configuration errors
- ✅ Single source of truth for types and schema
- ✅ Better error messages
- ✅ Easy to compose schemas
- ✅ Self-documenting code

**Negative**:

- ❌ Additional dependency
- ❌ Some performance overhead (negligible)
- ❌ Validation boilerplate for external APIs

### Implementation Timeline

- Week 1: Install zod, create config schema
- Week 2: Add validation to startup
- Week 3-4: Add validation to API responses
- Week 5-6: Add validation to database operations

### References

- [Zod Documentation](https://zod.dev)
- [Runtime Type Checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

## ADR-0003: Use Result Type Pattern (neverthrow)

**Date**: January 2026
**Status**: Proposed
**Author**: Technical Architecture Review

### Context

Current error handling uses try/catch blocks and Exception-throwing patterns:

```typescript
bot.catch(({ error }) => {
  if (error instanceof GrammyError) {
    logger.error(error, 'Error in request');
  } else {
    logger.error(error, 'Unknown error');
  }
});
```

Problems:

1. **Exception Hiding**: Errors can propagate silently up the stack
2. **No Type Safety**: Error types not reflected in function signatures
3. **Hard to Test**: Need to throw/catch in tests
4. **No Recovery**: Generic error handlers prevent recovery strategies
5. **Unclear Error Flow**: Hard to trace error paths through code

### Decision

Adopt **Result type pattern** (using neverthrow library) for explicit error handling:

```typescript
async function addTorrent(
  data: Buffer,
): Promise<Result<Torrent, TorrentError>> {
  // ...
}

// Usage:
const result = await torrentService.addTorrent(data);

if (result.isOk()) {
  const torrent = result.value;
  // handle success
} else {
  const error = result.error;
  // handle error with full type information
}
```

### Rationale

**Advantages over try/catch**:

1. **Type Safety**: Error types visible in signature
2. **Explicit Handling**: Compiler forces error handling
3. **Composable**: Combine results without nesting try/catch
4. **Testable**: No need to throw/catch in tests
5. **Functional**: Follows functional programming best practices

**Example: Composing Results**

```typescript
// Without Result type (nested try/catch hell)
async function downloadAndCompress(torrentId: string) {
  try {
    const torrent = await getTorrent(torrentId);
    try {
      const file = await downloadFile(torrent);
      try {
        const compressed = await compressVideo(file);
        return compressed;
      } catch (compressError) {
        logger.error(compressError, 'Compression failed');
        throw compressError;
      }
    } catch (downloadError) {
      logger.error(downloadError, 'Download failed');
      throw downloadError;
    }
  } catch (getTorrentError) {
    logger.error(getTorrentError, 'Get torrent failed');
    throw getTorrentError;
  }
}

// With Result type (clean composition)
async function downloadAndCompress(
  torrentId: string,
): Promise<Result<Buffer, DownloadError | CompressionError>> {
  return (await getTorrent(torrentId))
    .asyncAndThen((torrent) => downloadFile(torrent))
    .asyncAndThen((file) => compressVideo(file));
}

// Usage:
const result = await downloadAndCompress(torrentId);
if (result.isOk()) {
  // Handle success
} else {
  // Handle specific error type
}
```

### Implementation

```typescript
// domain/errors/TorrentError.ts
export class TorrentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class TorrentNotFoundError extends TorrentError {
  constructor(torrentId: string) {
    super('TORRENT_NOT_FOUND', `Torrent ${torrentId} not found`);
  }
}

// domain/services/TorrentService.ts
import { ok, err, Result } from 'neverthrow';

@injectable()
export class TorrentService {
  async addTorrent(data: Buffer): Promise<Result<Torrent, TorrentError>> {
    if (!data.length) {
      return err(new InvalidTorrentError('Empty torrent file'));
    }

    try {
      const parsed = await parseTorrent(data);
      const torrent = await this.repository.create(parsed);
      return ok(torrent);
    } catch (error) {
      return err(new TorrentParseError((error as Error).message));
    }
  }
}
```

### Consequences

**Positive**:

- ✅ Explicit error handling
- ✅ Type-safe error flows
- ✅ Better testability
- ✅ Functional composition
- ✅ Clear error recovery paths

**Negative**:

- ❌ Additional dependency
- ❌ More verbose code initially
- ❌ Learning curve for team
- ❌ Can't use async/await directly (though neverthrow supports it)

### Implementation Timeline

- Week 2: Install neverthrow, create domain error types
- Week 3: Refactor services to use Result
- Week 4: Update handlers to handle Result types
- Week 5: Remove try/catch blocks (except infrastructure)

### References

- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [Functional Error Handling](https://www.youtube.com/watch?v=srQqq9nZHc0)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)

---

## ADR-0004: Split TorrentsComposer into Separate Handlers

**Date**: January 2026
**Status**: Proposed
**Author**: Technical Architecture Review

### Context

`TorrentsComposer.ts` is 997 lines and handles:

- Torrent search
- Torrent download
- Torrent management
- File listing
- File download
- Video compression
- All message formatting
- In-memory state management

This violates Single Responsibility Principle and makes the code:

- Unmaintainable
- Untestable
- Hard to understand
- Prone to bugs

### Decision

Split `TorrentsComposer` into separate, focused handlers:

1. **SearchHandler** - Search torrents, format results
2. **TorrentHandler** - Add/remove torrents, show status
3. **FileHandler** - List files, format file lists
4. **DownloadHandler** - Download files, format for sharing
5. **MediaHandler** - Video compression, file processing

Each handler:

- Extends grammy Composer
- Handles 1-2 related commands
- 100-200 lines max
- Testable in isolation
- No side effects beyond Telegram API

### Implementation Structure

```typescript
// presentation/bot/handlers/SearchHandler.ts
@injectable()
export class SearchHandler extends Composer<MyContext> {
  constructor(private searchService: SearchService) {
    super();

    this.on('message::bot_command', async (ctx, next) => {
      if (ctx.hasCommand('search')) {
        await this.handleSearch(ctx);
      } else {
        await next();
      }
    });
  }

  private async handleSearch(ctx: MyContext): Promise<void> {
    const query = ctx.match[0];
    const result = await this.searchService.search(query);

    if (result.isOk()) {
      await ctx.reply(this.formatResults(result.value));
    } else {
      await ctx.reply(this.formatError(result.error));
    }
  }

  private formatResults(results: SearchResult[]): string {
    // Format logic
  }
}
```

### Handler Registry

```typescript
// Create handler registry for clean composition
export class HandlerRegistry {
  register(composer: Composer<MyContext>) {
    this.handlers.push(composer);
  }

  getAll(): Composer<MyContext>[] {
    return this.handlers;
  }
}

// index.ts
const searchHandler = container.resolve(SearchHandler);
const torrentHandler = container.resolve(TorrentHandler);
const fileHandler = container.resolve(FileHandler);

bot.use(searchHandler);
bot.use(torrentHandler);
bot.use(fileHandler);
```

### Benefits

- ✅ Single Responsibility
- ✅ Easier testing
- ✅ Clearer code
- ✅ Easier to extend
- ✅ Parallel development

### Timeline

- Week 5: Create new handler structure
- Week 6: Implement each handler (parallel)
- Week 7: Replace old TorrentsComposer
- Week 8: Remove old code

---

## ADR-0005: Use Persistent Session Storage

**Date**: January 2026
**Status**: Proposed
**Author**: Technical Architecture Review

### Context

Current implementation uses in-memory Maps for session state:

```typescript
private chatMessages = new Map<number, Message>();
private chatTorrents = new Map<number, Set<string>>();
```

Problems:

1. **Memory Leaks**: Never cleaned up, maps grow indefinitely
2. **Lost on Restart**: State gone after process restart
3. **Single Instance**: Impossible to scale to multiple processes
4. **Debugging**: Hard to inspect session state
5. **No Persistence**: Session state not recoverable

### Decision

Migrate to persistent session storage:

**Option 1 (Recommended)**: SQLite session store

- Same database as entities
- Works in single-instance deployment
- No additional infrastructure

**Option 2**: Redis session store

- Distributed sessions
- Enables multi-instance deployment
- External dependency

**Option 3**: Memory + Periodic Flush

- Hybrid approach
- Balance performance and persistence

### Implementation

```typescript
// infrastructure/session/SessionStore.ts
export interface SessionStore {
  get(chatId: number): Promise<ChatSession | null>;
  set(chatId: number, session: ChatSession): Promise<void>;
  delete(chatId: number): Promise<void>;
}

// SQLite implementation
@injectable()
export class SqliteSessionStore implements SessionStore {
  constructor(private em: EntityManager) {}

  async get(chatId: number): Promise<ChatSession | null> {
    return this.em.findOne(ChatSession, { chatId });
  }

  async set(chatId: number, session: ChatSession): Promise<void> {
    await this.em.upsert(ChatSession, {
      chatId,
      data: session.data,
      updatedAt: new Date(),
    });
  }
}

// Entity
@Entity()
export class ChatSession {
  @PrimaryKey() id!: number;
  @Property() chatId!: number;
  @Property({ type: 'json' }) data!: SessionData;
  @Property() updatedAt = new Date();
}
```

### Consequences

- ✅ Persistent sessions
- ✅ No memory leaks
- ✅ Debuggable
- ✅ Enables clustering
- ❌ Database query overhead (negligible)

---

## ADR-0006: Use Vitest for Testing Framework

**Date**: January 2026
**Status**: Proposed
**Author**: Technical Architecture Review

### Context

The project currently has zero tests. Implementing a test framework is critical for:

1. Regression prevention
2. Refactoring confidence
3. Documentation (tests as examples)
4. Quality assurance

### Decision

Use **vitest** as the testing framework:

```typescript
// services/__tests__/TorrentService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TorrentService } from '../TorrentService';

describe('TorrentService', () => {
  let service: TorrentService;
  let mockRepository: Mock<ITorrentRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new TorrentService(mockRepository);
  });

  it('should add torrent successfully', async () => {
    const result = await service.addTorrent(testData);
    expect(result.isOk()).toBe(true);
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('should fail with invalid torrent', async () => {
    const result = await service.addTorrent(invalidData);
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidTorrentError);
  });
});
```

### Rationale

- ESM-first (matches project)
- Fast execution
- Excellent DX
- Built-in mocking
- Supports Result types

### Timeline

- Week 7: Setup vitest
- Week 8: Add 60% test coverage
- Week 9: Add integration tests
- Week 10: Add E2E tests

---

## How to Propose New ADRs

1. Copy template below
2. Fill in all sections
3. Submit as PR to `docs/` directory
4. Get review from 2+ team members
5. Merge when approved
6. Update implementation timeline

### ADR Template

```markdown
# ADR-000X: [Title]

**Date**: [YYYY-MM-DD]
**Status**: Proposed | Accepted | Deprecated | Superseded
**Author**: [Name]

### Context

[Describe the issue and why it matters]

### Decision

[State the decision clearly]

### Rationale

[Explain why this decision over alternatives]

### Implementation

[Code examples showing how to implement]

### Consequences

[Positive and negative outcomes]

### References

[Links to relevant documentation]
```

---

## Summary of Key Decisions

| ADR      | Decision                     | Status   | Impact |
| -------- | ---------------------------- | -------- | ------ |
| ADR-0001 | Use tsyringe for DI          | Proposed | High   |
| ADR-0002 | Use Zod for validation       | Proposed | High   |
| ADR-0003 | Use Result type (neverthrow) | Proposed | High   |
| ADR-0004 | Split TorrentsComposer       | Proposed | High   |
| ADR-0005 | Persistent session storage   | Proposed | Medium |
| ADR-0006 | Use vitest for testing       | Proposed | High   |

All ADRs are currently **Proposed** pending team review and approval.
