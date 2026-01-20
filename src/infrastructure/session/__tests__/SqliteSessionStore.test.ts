import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SqliteSessionStore, SimpleDbAdapter } from '../SqliteSessionStore.js';

describe('SqliteSessionStore (was Redis test file)', () => {
  let client: SimpleDbAdapter;
  let store: SqliteSessionStore;

  beforeEach(() => {
    const clientObj = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    client = clientObj as unknown as SimpleDbAdapter;
    store = new SqliteSessionStore(client);
  });

  it('returns undefined for missing session', async () => {
    (client.get as any).mockResolvedValue(undefined);
    expect(await store.get(1)).toBeUndefined();
  });

  it('stores and retrieves session data', async () => {
    const data = { a: 1 };
    await store.set(2, data);
    expect((client.set as any)).toHaveBeenCalled();
    (client.get as any).mockResolvedValue(JSON.stringify(data));
    const got = await store.get(2);
    expect(got).toEqual(data);
  });

  it('deletes session', async () => {
    await store.delete(3);
    expect((client.del as any)).toHaveBeenCalled();
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
