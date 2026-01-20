# Dependency Analysis & Recommendations

**Document Version:** 1.0  
**Date:** January 2026  
**Scope:** Smart Home Media Assistant Telegram Bot

---

## Executive Summary

Current dependency stack is healthy with active maintenance. Recommended additions focus on robustness (validation, error handling, DI) and developer experience. Minor optimization of existing dependencies suggested.

---

## Current Dependencies Deep Dive

### Core Bot Framework

#### grammy (^1.36.3) ✅
- **Status**: Actively maintained
- **Stars**: 2.9k GitHub
- **Last Release**: Recently active
- **Recommendation**: KEEP
- **Notes**: Best-in-class TypeScript Telegram bot library. No viable alternative.
- **Risk Level**: Low

#### @grammyjs/fluent (^1.0.3) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Official grammy i18n plugin using Mozilla Fluent. Well-integrated.
- **Risk Level**: Low

### Database & ORM

#### @mikro-orm/* (6.4.16) ⚠️
- **Status**: Actively maintained
- **Stars**: 7.5k GitHub
- **Recommendation**: EVALUATE FOR REPLACEMENT
- **Analysis**:
  - ✅ Great TypeScript support
  - ✅ Good query builder
  - ✅ Flexible relationship handling
  - ❌ Heavier than alternatives
  - ❌ Steeper learning curve for new devs
  - ❌ Slower cold starts (reflection)
  
**Alternatives**:
1. **Drizzle** (★ Recommended)
   - Pros: Ultra-lightweight, type-safe, fast build times, excellent DX
   - Cons: Newer ecosystem, smaller community
   - Migration effort: MEDIUM
   - Verdict: Better choice for this project size
   
2. **Prisma**
   - Pros: Excellent DX, migrations, visual studio
   - Cons: Heavier, migration lock-in
   - Migration effort: HIGH
   - Verdict: Good but overkill for current needs
   
3. **TypeORM**
   - Pros: Similar to MikroORM, more decorators
   - Cons: Similar issues to MikroORM
   - Migration effort: HIGH
   - Verdict: Lateral move, not worth it

**Action**: Keep MikroORM for now. Consider Drizzle during major refactor (Phase 4).

---

### Media Processing

#### fluent-ffmpeg (^2.1.3) ✅
- **Status**: Stable, maintained
- **Recommendation**: KEEP
- **Notes**: Reliable Node.js ffmpeg wrapper. Standard choice.
- **Risk Level**: Low
- **Future Consideration**: Could replace with `@ffmpeg/ffmpeg` (pure JS) for bundling, but fluent-ffmpeg is better for this use case

---

### Logging

#### pino (^9.6.0) ✅
- **Status**: Actively maintained
- **Stars**: 12k GitHub
- **Recommendation**: KEEP + ADD pino-http
- **Notes**: Best JSON logger for Node.js. Fast and extensible.
- **Risk Level**: Low
- **Complementary Package**: Add `pino-http` (^10.1.2)

#### pino-pretty (^13.0.0) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP (dev dependency)
- **Notes**: Dev-time pretty printer for pino. Keeps logs JSON in prod.
- **Risk Level**: Low

---

### Date/Time Handling

#### dayjs (^1.11.13) ⚠️
- **Status**: Actively maintained
- **Recommendation**: EVALUATE FOR REPLACEMENT
- **Analysis**:
  - ✅ Lightweight (2KB)
  - ✅ Good plugin system
  - ✅ Currently working well
  - ❌ Smaller ecosystem than alternatives
  - ❌ Less battle-tested in complex scenarios
  
**Alternative**:
1. **date-fns** (★ Recommended)
   - Pros: Modular (tree-shakeable), pure functions, 250+ utilities, better TS
   - Cons: Slightly larger (13KB), but most modules unused
   - Migration effort: LOW (mostly API compatibility)
   - Verdict: Better long-term choice
   
2. **Day.js** (keep as is)
   - Perfectly fine for current usage
   - Switch only if you need advanced features

**Action**: Optional replacement. If doing refactor, migrate to date-fns. Not critical.

---

### HTML Parsing

#### cheerio (^1.0.0) ✅
- **Status**: Actively maintained
- **Stars**: 28k GitHub
- **Recommendation**: KEEP
- **Notes**: jQuery-like syntax for Node.js. Standard choice for parsing.
- **Risk Level**: Low

---

### Cookie Management

#### tough-cookie (^5.1.2) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: RFC 6265 compliant cookie jar. Used by many HTTP clients.
- **Risk Level**: Low

---

### Utilities

#### parse-torrent (^11.0.18) ✅
- **Status**: Stable (npm trend shows stable)
- **Recommendation**: KEEP
- **Notes**: Only solid torrent file parser for Node.js
- **Risk Level**: Low

#### uuid (^11.1.0) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Standard UUID generation. No alternatives needed.
- **Risk Level**: Low

#### dotenv (^16.5.0) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP (but add validation layer)
- **Notes**: Standard .env loading. Will be wrapped with zod validation.
- **Risk Level**: Low

#### file-type (^21.0.0) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Reliable file type detection. Uses magic numbers.
- **Risk Level**: Low

#### tmp (^0.2.3) ✅
- **Status**: Stable
- **Recommendation**: KEEP
- **Notes**: Temporary file handling. Works well.
- **Risk Level**: Low

#### @moebius/fluent (^1.1.0) ⚠️
- **Status**: Less actively maintained
- **Recommendation**: EVALUATE REMOVAL
- **Notes**: Alternative fluent integration. Redundant with @grammyjs/fluent
- **Action**: Remove - use only @grammyjs/fluent

---

## DevDependencies Review

#### typescript (^5.8.3) ✅
- **Status**: Latest stable
- **Recommendation**: KEEP at latest
- **Action**: Subscribe to releases, test before updating minor versions

#### eslint (^9.25.1) ✅
- **Status**: Latest
- **Recommendation**: KEEP at latest
- **Notes**: Modern flat config. Good rules coverage.
- **Action**: Add stricter rules in refactor phase

#### prettier (^3.5.3) ✅
- **Status**: Latest
- **Recommendation**: KEEP
- **Notes**: Code formatter. Non-negotiable for team projects.

#### typescript-eslint (^8.32.0) ✅
- **Status**: Latest
- **Recommendation**: KEEP
- **Notes**: Excellent TypeScript support for ESLint.

#### eslint-config-prettier (^10.1.5) ✅
- **Status**: Latest
- **Recommendation**: KEEP
- **Notes**: Disables conflicting ESLint rules.

#### eslint-plugin-unicorn (^59.0.1) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP + CONFIGURE STRICTER
- **Notes**: Great ES best practices. Use more rules.

#### eslint-plugin-simple-import-sort (^12.1.1) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Enforces import organization.

#### ts-node (^10.9.2) ✅
- **Status**: Stable (dev only)
- **Recommendation**: KEEP + ADD tsx
- **Notes**: Used in dev scripts. Add `tsx` as faster alternative.

#### husky (^9.1.7) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Git hooks for linting pre-commit.

#### lint-staged (^15.5.1) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Runs linters on staged files. Efficient.

#### semantic-release (^24.2.5) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Automated versioning and publishing. Excellent setup.

#### @commitlint/cli (^19.8.0) ✅
#### @commitlint/config-conventional (^19.8.0) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Enforces conventional commits. Works with semantic-release.

#### @semantic-release/git (^10.0.1) ✅
- **Status**: Actively maintained
- **Recommendation**: KEEP
- **Notes**: Git integration for semantic-release.

#### Type Definition Packages
- `@types/node` (^22.15.17) ✅
- `@types/fluent-ffmpeg` (^2.1.27) ✅
- `@types/parse-torrent` (^5.8.7) ✅
- `@types/tmp` (^0.2.6) ✅
- `@types/uuid` (^10.0.0) ✅

**Recommendation**: KEEP ALL - essential for TypeScript

---

## Critical Missing Dependencies

### 1. Validation Library ⚠️ CRITICAL

**Recommendation**: Add **`zod` (^3.22.4)**

```typescript
// Usage
import { z } from 'zod';

const ConfigSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  SECRET_KEY: z.string().min(32),
  QBT_WEB_UI_ADDRESS: z.string().url(),
  // ...
});

const config = ConfigSchema.parse(process.env);
```

**Why**:
- Runtime validation of config at startup
- Type inference from schema
- Better error messages
- Validates external API responses

**Alternatives**: `joi`, `yup` - not recommended

---

### 2. Dependency Injection ⚠️ CRITICAL

**Recommendation**: Add **`tsyringe` (^4.8.1)**

```typescript
import 'reflect-metadata';
import { container, injectable } from 'tsyringe';

@injectable()
export class TorrentService {
  constructor(private repo: TorrentRepository) {}
}

container.register(TorrentService, {
  useClass: TorrentService,
});
```

**Why**:
- Decouples service dependencies
- Enables testing with mocks
- Follows SOLID principles
- Industry standard pattern

**Alternatives**: `awilix`, `inversify` - tsyringe is simplest for this project

---

### 3. Error Handling Pattern ⚠️ HIGH

**Recommendation**: Add **`neverthrow` (^4.3.2)**

```typescript
import { ok, err } from 'neverthrow';

const result = await torrentService.addTorrent(data);

if (result.isOk()) {
  const torrent = result.value;
} else {
  const error = result.error;
}
```

**Why**:
- Explicit error handling (no try/catch hell)
- Compiler forces error handling
- Functional error composition
- Better than throwing exceptions

**Alternatives**: `fp-ts` (too heavy), `effect` (complex for this project)

---

### 4. HTTP Client ⚠️ MEDIUM

**Current**: Uses native `fetch` via tough-cookie  
**Recommendation**: Add **`axios` (^1.7.7)** OR keep fetch with wrapper

```typescript
// Option 1: Use axios
const client = axios.create({
  baseURL: config.QB_ADDRESS,
  timeout: 5000,
});

// Option 2: Create fetch wrapper (minimal)
export const httpClient = new HttpClient(fetch);
```

**Decision Matrix**:
| Factor | Axios | Fetch |
|--------|-------|-------|
| Bundle size | 10KB | 0KB |
| Error handling | Better | Needs wrapper |
| Interceptors | Built-in | Manual |
| Cancellation | ✅ | AbortController |
| Cookie handling | ✅ | Via tough-cookie |

**Recommendation**: Keep fetch with proper error wrapper. Axios adds little value.

---

### 5. HTTP Request Logging ⚠️ MEDIUM

**Recommendation**: Add **`pino-http` (^10.1.2)**

```typescript
import pinoHttp from 'pino-http';

// In bot setup
app.use(pinoHttp({
  logger: logger,
  serializers: {
    req: (request) => ({ /* custom */ }),
    res: (response) => ({ /* custom */ }),
  },
}));
```

**Why**:
- Structured logging for HTTP requests
- Better debugging
- Integrates with Pino

---

### 6. Testing Framework ⚠️ CRITICAL FOR REFACTOR

**Recommendation**: Add **`vitest` (^1.1.0)**

```json
{
  "devDependencies": {
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0",
    "vi": "^latest",
    "@testing-library/node": "^1.2.0"
  }
}
```

**Why**:
- ESM-first (matches project)
- Fast execution
- Excellent DX
- Built-in mocking

**Configuration**:
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

**Alternatives**: `jest` - requires extra config for ESM

---

### 7. TypeScript Execution ⚠️ DEV ONLY

**Recommendation**: Add **`tsx` (^4.7.0)**

Usage: `tsx src/index.ts` instead of `node --loader ts-node/esm`

**Why**:
- Faster than ts-node
- Better error messages
- Simpler setup

---

### 8. Path Aliases Support ⚠️ BUILD ONLY

**Recommendation**: Add **`tsc-alias` (^1.8.8)**

**Why**:
- Converts TS path aliases to relative imports in compiled JS
- Essential if using `@/services` style imports

---

## Optional "Nice to Have" Dependencies

### Monitoring & Observability
- `@sentry/node` (error tracking)
- `prometheus-client` (metrics)

### Caching
- `ioredis` (Redis client, if using Redis)
- `lru-cache` (in-memory cache fallback)

### API Documentation
- `swagger-jsdoc` (if building REST API)
- `zod-openapi` (OpenAPI generation from Zod)

---

## Security Audit

### Vulnerability Checks
```bash
# Check for known vulnerabilities
npm audit
yarn audit

# Update security patches
npm audit fix
```

**Current Status**: Monitor quarterly

### Dependency Security Best Practices
1. ✅ Use exact versions for critical packages (@mikro-orm)
2. ✅ Use caret ranges for stable packages (grammy, pino)
3. ⚠️ Add `renovate` or `dependabot` for automated updates
4. ⚠️ Implement security policy for sensitive packages

---

## Recommended Installation Plan

### Phase 1: Validation & DI Foundation
```bash
yarn add zod@^3.22.4 tsyringe@^4.8.1 reflect-metadata@^0.1.13
yarn add -D vitest@^1.1.0 @vitest/ui@^1.1.0 tsx@^4.7.0
```

### Phase 2: Error Handling & Logging
```bash
yarn add neverthrow@^4.3.2 pino-http@^10.1.2
yarn add -D tsc-alias@^1.8.8
```

### Phase 3: Optional Replacements
```bash
# Date library (optional)
yarn add date-fns@^3.3.1

# Remove if replacing
yarn remove dayjs @moebius/fluent
```

---

## Migration Checklist

- [ ] Run `npm audit` / `yarn audit` and fix critical issues
- [ ] Add zod with validation schema
- [ ] Setup tsyringe DI container
- [ ] Implement Result type pattern with neverthrow
- [ ] Add vitest configuration
- [ ] Create first test file
- [ ] Add pino-http to logger setup
- [ ] Document dependency decisions in ADR
- [ ] Setup dependabot/renovate
- [ ] Remove redundant @moebius/fluent

---

## Maintenance Plan

### Weekly
- Monitor GitHub security alerts
- Check for critical patches

### Monthly
- Review new major versions
- Update non-critical dependencies
- Test updates in staging

### Quarterly
- Full security audit
- Evaluate new libraries for pain points
- Benchmark performance

---

## Conclusion

**Critical Path** (do immediately):
1. Add zod for validation
2. Add tsyringe for DI
3. Add vitest for testing
4. Add neverthrow for error handling

**Nice to Have**:
- date-fns as dayjs replacement
- Drizzle as ORM alternative (long-term)
- pino-http for better logging

**Remove**:
- @moebius/fluent (redundant)

**Keep Everything Else** - the current stack is solid and well-maintained.
