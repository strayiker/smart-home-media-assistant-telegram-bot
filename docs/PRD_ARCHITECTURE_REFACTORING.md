# Smart Home Media Assistant Telegram Bot - Architecture Refactoring PRD

**Document Version:** 1.0
**Created:** January 2026
**Author:** Technical Architecture Review
**Status:** Ready for Implementation

---

## Executive Summary

The Smart Home Media Assistant Telegram Bot is a well-functional project (~2400 LOC) that serves as a Telegram interface for managing torrent downloads through qBittorrent and searching on Rutracker. While the core functionality is solid, the project lacks modern architectural patterns, proper separation of concerns, and comprehensive testing infrastructure.

This PRD outlines a strategic refactoring to modernize the codebase, improve maintainability, and establish patterns for scalable growth.

---

## Current State Assessment

### Strengths

- ✅ Clear core functionality (search torrents, manage downloads, retrieve files)
- ✅ Proper use of TypeScript with decent type safety
- ✅ Entity-based database abstraction with MikroORM
- ✅ Composer pattern for bot handlers
- ✅ Fluent-based i18n support
- ✅ Docker containerization
- ✅ Proper CI/CD with semantic-release

### Pain Points

#### 1. **Architecture Issues**

- **Monolithic Composers**: `TorrentsComposer.ts` is 997 lines - single responsibility principle violated
- **No Service Layer**: Business logic mixed with HTTP/Telegram handling
- **Tight Coupling**: Direct database calls in composers, QBittorrent client usage scattered
- **No Dependency Injection**: Manual instantiation and passing of dependencies
- **Missing Error Handling Strategy**: No consistent error boundary pattern
- **In-Memory State Management**: `chatMessages`, `chatTorrents` Maps leak memory, no persistence

#### 2. **Code Organization**

- `utils/` directory is a dumping ground (15+ files with mixed concerns)
- Repositories buried in utils instead of domain layer
- Config management scattered across multiple files
- No clear domain boundaries

#### 3. **Testing & Quality**

- ❌ Zero unit tests
- ❌ No integration tests
- ❌ No E2E tests
- ❌ No test utilities or fixtures
- ❌ No test coverage tracking

#### 4. **Dependency Analysis**

**Current Dependencies Review:**

| Package          | Version  | Status    | Alternative              | Action                                    |
| ---------------- | -------- | --------- | ------------------------ | ----------------------------------------- |
| grammy           | ^1.36.3  | ✅ Active | -                        | Keep                                      |
| @grammyjs/fluent | ^1.0.3   | ✅ Active | -                        | Keep                                      |
| @mikro-orm/\*    | 6.4.16   | ✅ Active | TypeORM, Prisma, Drizzle | **Consider Drizzle** (lighter, better DX) |
| fluent-ffmpeg    | ^2.1.3   | ✅ Active | ffmpeg.wasm, sharp       | Keep (ffmpeg binding solid)               |
| pino             | ^9.6.0   | ✅ Active | winston, bunyan          | Keep (performant)                         |
| cheerio          | ^1.0.0   | ✅ Active | jsdom, htmlparser2       | Keep                                      |
| tough-cookie     | ^5.1.2   | ✅ Active | cookie                   | Keep                                      |
| dayjs            | ^1.11.13 | ✅ Active | date-fns (recommended)   | **Consider date-fns**                     |
| parse-torrent    | ^11.0.18 | ✅ Active | -                        | Keep                                      |
| uuid             | ^11.1.0  | ✅ Active | -                        | Keep                                      |
| dotenv           | ^16.5.0  | ✅ Active | -                        | Keep                                      |
| file-type        | ^21.0.0  | ✅ Active | -                        | Keep                                      |
| tmp              | ^0.2.3   | ✅ Active | -                        | Keep                                      |
| typescript       | ^5.8.3   | ✅ Latest | -                        | Keep                                      |
| eslint           | ^9.25.1  | ✅ Latest | -                        | Keep                                      |
| prettier         | ^3.5.3   | ✅ Latest | -                        | Keep                                      |

**Missing Packages (High Priority):**

- ❌ `zod` or `joi` - No runtime schema validation
- ❌ `pino-http` - No structured HTTP request logging
- ❌ `neverthrow` or similar - No Result/Either pattern for error handling
- ❌ `tsyringe` or `awilix` - No DI container
- ❌ `vitest` or `jest` - No testing framework

#### 5. **Type Safety Gaps**

- No validation layer between external data and domain models
- Config values not validated at startup
- Loose typing on API responses from qBittorrent

#### 6. **Scalability Concerns**

- Can't easily add new search engines without modifying core
- Hard to add new command handlers (composer structure)
- No plugin architecture
- Difficult to extract shared logic

---

## Proposed Architecture

### Layer Structure

```
src/
├── domain/                      # Core business logic (no frameworks)
│   ├── entities/                # Domain models
│   │   ├── Torrent.ts
│   │   ├── SearchResult.ts
│   │   ├── User.ts
│   │   ├── ChatSession.ts
│   │   └── FileShare.ts
│   ├── repositories/            # Data access abstractions
│   │   ├── IUserRepository.ts
│   │   ├── ITorrentRepository.ts
│   │   ├── IChatSessionRepository.ts
│   │   └── ...
│   ├── services/                # Business logic
│   │   ├── TorrentService.ts
│   │   ├── SearchService.ts
│   │   ├── FileService.ts
│   │   ├── ChatSessionService.ts
│   │   └── ...
│   ├── errors/                  # Domain-specific errors
│   │   ├── DomainError.ts
│   │   ├── TorrentErrors.ts
│   │   ├── SearchErrors.ts
│   │   └── ...
│   └── types/                   # Domain types & interfaces
│       ├── index.ts
│
├── infrastructure/              # Framework integration
│   ├── orm/                     # Database
│   │   ├── entities/            # MikroORM entity models
│   │   ├── migrations/
│   │   └── config.ts
│   ├── qbittorrent/            # qBittorrent integration
│   │   ├── QBittorrentAdapter.ts
│   │   ├── models.ts
│   │   └── types.ts
│   ├── search/                 # Search engines
│   │   ├── SearchEngineAdapter.ts
│   │   ├── RutrackerAdapter.ts
│   │   └── ...
│   ├── storage/                # File storage
│   │   ├── FileStorageAdapter.ts
│   │   └── ...
│   ├── media/                  # Media processing
│   │   ├── VideoCompressionService.ts
│   │   ├── MediaMetadataService.ts
│   │   └── ...
│   ├── logger/
│   │   └── LoggerFactory.ts
│   ├── config/
│   │   ├── ConfigProvider.ts
│   │   └── ConfigValidator.ts
│   └── di/
│       └── Container.ts
│
├── presentation/               # Bot handlers & API
│   ├── bot/
│   │   ├── handlers/           # Command handlers
│   │   │   ├── SearchHandler.ts
│   │   │   ├── TorrentHandler.ts
│   │   │   ├── FileHandler.ts
│   │   │   ├── AuthHandler.ts
│   │   │   └── ...
│   │   ├── middleware/         # Bot middlewares
│   │   │   ├── AuthMiddleware.ts
│   │   │   ├── LocaleMiddleware.ts
│   │   │   ├── ErrorMiddleware.ts
│   │   │   └── LoggingMiddleware.ts
│   │   ├── formatters/         # Response formatters
│   │   │   ├── TorrentFormatter.ts
│   │   │   ├── SearchResultFormatter.ts
│   │   │   └── ...
│   │   ├── Bot.ts              # Main bot setup
│   │   └── types.ts            # Bot-specific types
│   └── api/                    # REST API (future)
│       └── ...
│
├── shared/
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── ...
│   ├── constants/
│   │   └── index.ts
│   └── types/
│       └── index.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── logger.config.ts
│   └── env.schema.ts
│
├── di.ts                       # DI container setup
├── app.ts                      # Application bootstrap
└── index.ts                    # Entry point
```

### Key Architectural Improvements

#### 1. **Dependency Injection**

- Introduce `tsyringe` for IoC container
- All services registered at startup
- Better testability and loose coupling

#### 2. **Error Handling**

- Introduce `neverthrow` Result type
- Explicit error handling patterns
- Custom error hierarchy

#### 3. **Validation**

- Runtime validation with `zod`
- Config validation on startup
- API payload validation

#### 4. **Service Layer**

- Extract business logic from composers
- Clear interfaces between layers
- Easier to test and extend

#### 5. **Handler Pattern**

- Split TorrentsComposer into 5-6 separate handlers
- Each handler focuses on one use case
- Shared middleware for cross-cutting concerns

#### 6. **Session Management**

- Persistent session storage (Redis or SQLite)
- Proper session lifecycle
- No in-memory leaks

#### 7. **Plugin Architecture**

- Search engines as plugins
- Handler registration system
- Extensible design

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Setup DI container with tsyringe
- [ ] Create validation schema with zod
- [ ] Setup config validation at startup
- [ ] Add test infrastructure (vitest, @testing-library)
- [ ] Create error boundary system
- [ ] Add Result type pattern

**Deliverables:**

- DI container working
- Config validation passing
- Unit test examples
- Error handling patterns established

### Phase 2: Core Refactoring (Weeks 3-4)

- [ ] Extract services from composers
  - [ ] TorrentService
  - [ ] SearchService
  - [ ] FileService
  - [ ] ChatSessionService
- [ ] Create repository interfaces
- [ ] Implement domain entities
- [ ] Move business logic to services

**Deliverables:**

- Services layer complete
- Core business logic decoupled
- 80% unit test coverage for services

### Phase 3: Presentation Refactoring (Weeks 5-6)

- [ ] Extract handlers from composers
  - [ ] SearchHandler
  - [ ] TorrentHandler
  - [ ] FileHandler
  - [ ] AuthHandler
- [ ] Create middleware layer
- [ ] Build formatter utilities
- [ ] Implement error middleware

**Deliverables:**

- Handlers properly separated
- Middleware chain working
- Better error responses

### Phase 4: Testing & Documentation (Weeks 7-8)

- [ ] Add unit test suite (60%+ coverage)
- [ ] Add integration tests
- [ ] Setup E2E test structure
- [ ] Create architecture documentation
- [ ] Update README with new structure
- [ ] Create ADR (Architecture Decision Records)

**Deliverables:**

- Test suite with 60%+ coverage
- Documentation complete
- ADR document for major decisions

### Phase 5: Infrastructure & Cleanup (Weeks 9-10)

- [ ] Update TypeScript configuration
- [ ] Optimize Docker build
- [ ] Add health check endpoints
- [ ] Performance monitoring
- [ ] Logging improvements

**Deliverables:**

- Optimized build
- Monitoring in place
- Production-ready

### Phase 6: Documentation & Knowledge Transfer (Week 11)

- [ ] Generate architecture diagrams
- [ ] Create contributor guide
- [ ] Document API contracts
- [ ] Create troubleshooting guide

**Deliverables:**

- Comprehensive docs
- Developer-friendly setup guide

---

## Dependencies to Add

### Core

```json
{
  "tsyringe": "^4.8.1", // Dependency Injection
  "zod": "^3.22.4", // Runtime validation
  "neverthrow": "^4.3.2", // Result type pattern
  "axios": "^1.7.7", // HTTP client (replaces fetch wrapper)
  "pino-http": "^10.1.2", // HTTP request logging
  "date-fns": "^3.3.1" // Date utility (consider replacing dayjs)
}
```

### Dev

```json
{
  "vitest": "^1.1.0", // Testing framework
  "@vitest/ui": "^1.1.0", // Test UI
  "@testing-library/node": "^1.2.0", // Testing utilities
  "ts-node": "^10.9.2", // Already present
  "@types/jest": "^29.5.0", // Type definitions for test patterns
  "tsx": "^4.7.0", // TypeScript execution
  "tsc-alias": "^1.8.8" // Path alias support in built code
}
```

### Dependencies to Deprecate

- `dayjs` → `date-fns` (more tree-shakeable, better DX)
- Direct database calls → Repository pattern via DI

---

## Code Quality Improvements

### Linting & Formatting

- Keep ESLint & Prettier
- Add stricter rules:
  ```js
  // eslint.config.js additions
  {
    rules: {
      'unicorn/consistent-destructuring': 'error',
      'unicorn/no-unsafe-regex': 'error',
      'no-implicit-coercion': 'error',
      '@typescript-eslint/explicit-function-return-types': 'error'
    }
  }
  ```

### Type Safety

- Enable stricter tsconfig:
  ```json
  {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "exactOptionalPropertyTypes": true
  }
  ```

### Testing Standards

- Minimum 60% coverage for Phase 4
- 80% for critical paths (services, repositories)
- 100% for pure utilities and domain logic

---

## Migration Strategy

### Non-Breaking Changes

1. Add new layers alongside existing code
2. Implement adapters/facades to existing code
3. Gradual migration of composers to handlers
4. No changes to public APIs

### Phase-by-Phase Approach

```
Week 1-2:  New code + old code coexist (DI, validation)
Week 3-4:  Services extracted but still used by old composers
Week 5-6:  Handlers extracted, old composers deprecated
Week 7-8:  Remove old composers, full refactor complete
```

### Rollback Strategy

- Feature flags for new vs. old implementations
- Ability to switch back if issues arise
- Database schema backward compatible

---

## Testing Strategy

### Unit Tests

```typescript
// services/__tests__/TorrentService.test.ts
describe('TorrentService', () => {
  let service: TorrentService;
  let mockRepository: Mock<ITorrentRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new TorrentService(mockRepository);
  });

  it('should add torrent with valid input', async () => {
    const result = await service.addTorrent({...});
    expect(result.isOk()).toBe(true);
  });

  it('should fail with invalid torrent file', async () => {
    const result = await service.addTorrent({...});
    expect(result.isErr()).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/TorrentWorkflow.test.ts
describe('Torrent Download Workflow', () => {
  it('should search -> download -> manage complete flow', async () => {
    // Test real service interactions
  });
});
```

### E2E Tests

```typescript
// __tests__/e2e/bot.test.ts
describe('Bot E2E Tests', () => {
  it('should handle /search command end-to-end', async () => {
    // Full bot flow testing
  });
});
```

---

## Performance Considerations

### Optimizations

1. **Session Persistence**: Move from in-memory to SQLite/Redis
   - Reduce memory leaks
   - Enable multi-instance deployment

2. **Lazy Loading**: Entities and services loaded on demand

3. **Caching Strategy**:
   - Cache search results (5 min TTL)
   - Cache user preferences
   - Cache file metadata

4. **Async Processing**:
   - Queue long-running operations
   - Non-blocking video compression
   - Background torrent status updates

5. **Database Optimization**:
   - Proper indexes on frequently queried columns
   - Connection pooling configuration
   - Query performance monitoring

---

## Monitoring & Observability

### Logging

- Structured JSON logging with Pino
- Request/response tracing
- Error stack traces with context

### Metrics

- Command execution times
- qBittorrent API response times
- Search engine performance
- Database query performance

### Health Checks

```typescript
// GET /health
{
  "status": "ok",
  "database": "connected",
  "qbittorrent": "connected",
  "uptime": 3600
}
```

---

## Documentation Requirements

### Architecture Documentation

1. **Architecture Decision Records (ADRs)**
   - ADR-001: Why DI Container
   - ADR-002: Why Result Type Pattern
   - ADR-003: Service Layer Design

2. **System Diagrams**
   - Component diagram
   - Data flow diagram
   - Deployment diagram

3. **API Documentation**
   - OpenAPI/Swagger for handlers
   - Domain service interfaces
   - Repository contracts

### Developer Documentation

1. **Setup Guide**: Step-by-step development environment
2. **Contributing Guide**: How to add features
3. **Troubleshooting**: Common issues and solutions
4. **API Reference**: Handler signatures and responses

---

## Success Metrics

- ✅ 60%+ unit test coverage
- ✅ Reduced TorrentsComposer from 997 lines to <300 lines per handler
- ✅ All files <400 lines
- ✅ Zero circular dependencies
- ✅ Full type safety (strict mode)
- ✅ Zero in-memory state leaks
- ✅ Clear separation of concerns
- ✅ Comprehensive documentation
- ✅ Easy to onboard new developers

---

## Risk Mitigation

| Risk                        | Probability | Impact | Mitigation                  |
| --------------------------- | ----------- | ------ | --------------------------- |
| Breaking changes to bot API | Low         | High   | Use adapters, feature flags |
| Database migration issues   | Medium      | High   | Thorough testing, backups   |
| Performance degradation     | Low         | Medium | Load testing, profiling     |
| Developer confusion         | Medium      | Medium | Documentation, examples     |

---

## Conclusion

This refactoring will transform the Smart Home Media Assistant from a functional monolith into a well-architected, maintainable, and testable system. The phased approach allows for gradual migration without disrupting current functionality, and the new structure will support future growth and feature additions.

**Next Steps:**

1. Review and approve PRD
2. Setup project board with Phase 1 tasks
3. Begin DI container and validation setup
4. Establish code review standards for new architecture
