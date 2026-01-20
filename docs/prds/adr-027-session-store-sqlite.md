# ADR 027 — Session storage: SQLite-backed sessions

Status: Proposed

Context

- The project previously used Redis for session persistence; we are migrating to a SQLite-backed session store to simplify local development and reduce infra dependencies.
- Current code has `SqliteSessionStore` adapter with in-memory fallback; we need a formal decision record and migration plan.

Decision

- Use a dedicated `ChatSession` table persisted via the existing MikroORM setup (SQLite dialect).
- Implement a `ChatSession` entity under `src/entities/ChatSession.ts` and a migration to create the table.
- Provide a repository-backed session store implementation that reads/writes JSON payloads and uses `undefined` when missing.
- Keep the in-memory fallback for tests and where adapter is not available.

Consequences

- Pros:
  - No external infrastructure needed for simple deployments and CI.
  - Sessions survive process restarts and are easy to inspect.
  - Keeps codebase self-contained and portable.
- Cons:
  - Not suitable for multi-instance horizontal scaling without central DB; acceptable for our current deployment targets.
  - Requires migration and background cleanup of expired sessions.

Migration plan

1. Add `ChatSession` entity and generate MikroORM migration to create `chat_session` table.
2. Implement DB-backed session store that persists session JSON and TTL.
3. Register DB-backed store in DI behind the `SqliteSessionStore` abstraction.
4. Add a periodic cleanup job to remove expired sessions.
5. Add migration step to CI and deployment to apply DB migrations.

Date: 2026-01-20
Author: automated assistant (pair-programming)
