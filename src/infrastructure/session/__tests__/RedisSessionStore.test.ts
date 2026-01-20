import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SqliteSessionStore } from '../SqliteSessionStore.js';

describe('SqliteSessionStore (was Redis test file)', () => {
  let client: any;
  let store: SqliteSessionStore;

  beforeEach(() => {
    client = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(),
      del: vi.fn().mockResolvedValue(),
    };
    store = new SqliteSessionStore(client as any);
  });

  it('returns undefined for missing session', async () => {
    client.get.mockResolvedValue(null);
    expect(await store.get(1)).toBeUndefined();
  });

  it('stores and retrieves session data', async () => {
    const data = { a: 1 };
    await store.set(2, data);
    expect(client.set).toHaveBeenCalled();
    client.get.mockResolvedValue(JSON.stringify(data));
    const got = await store.get(2);
    expect(got).toEqual(data);
  });

  it('deletes session', async () => {
    await store.delete(3);
    expect(client.del).toHaveBeenCalled();
  });

  it('falls back to in-memory when adapter not provided', async () => {
    const s = new SqliteSessionStore();
    expect(await s.get(10)).toBeUndefined();
    await s.set(10, { b: 2 });
    expect(await s.get(10)).toEqual({ b: 2 });
    await s.delete(10);
    expect(await s.get(10)).toBeUndefined();
  });
});
