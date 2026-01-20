import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SQLiteSessionStore } from '../SQLiteSessionStore.js';

describe('SQLiteSessionStore (was Redis test file)', () => {
  let client: any;
  let store: SQLiteSessionStore;

  beforeEach(() => {
    client = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(),
      del: vi.fn().mockResolvedValue(),
    };
    store = new SQLiteSessionStore(client as any);
  });

  it('returns null for missing session', async () => {
    client.get.mockResolvedValue(null);
    expect(await store.get(1)).toBeNull();
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
    const s = new SQLiteSessionStore();
    expect(await s.get(10)).toBeNull();
    await s.set(10, { b: 2 });
    expect(await s.get(10)).toEqual({ b: 2 });
    await s.delete(10);
    expect(await s.get(10)).toBeNull();
  });
});
