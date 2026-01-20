import { beforeEach, describe, expect, it, vi } from 'vitest';

import DbSessionStore from '../DbSessionStore.js';

describe('DbSessionStore', () => {
  let findOne: ReturnType<typeof vi.fn>;
  let persistAndFlush: ReturnType<typeof vi.fn>;
  let flush: ReturnType<typeof vi.fn>;
  let removeAndFlush: ReturnType<typeof vi.fn>;
  let nativeDelete: ReturnType<typeof vi.fn>;
  let em: any;
  let store: DbSessionStore;

  beforeEach(() => {
    findOne = vi.fn().mockResolvedValue(null);
    persistAndFlush = vi.fn().mockResolvedValue();
    flush = vi.fn().mockResolvedValue();
    removeAndFlush = vi.fn().mockResolvedValue();
    nativeDelete = vi.fn().mockResolvedValue();

    em = {
      findOne: (e: unknown, q: unknown) => findOne(e, q),
      persistAndFlush: (v: unknown) => persistAndFlush(v),
      flush: () => flush(),
      removeAndFlush: (v: unknown) => removeAndFlush(v),
      nativeDelete: (e: unknown, q: unknown) => nativeDelete(e, q),
    };

    store = new DbSessionStore(em);
  });

  it('returns undefined for missing session', async () => {
    findOne.mockResolvedValueOnce(null);
    expect(await store.get(1)).toBeUndefined();
    expect(findOne).toHaveBeenCalledWith(expect.anything(), { chatId: '1' });
  });

  it('stores and retrieves session data', async () => {
    const data = { a: 1 };
    // first call to findOne returns null -> persist path
    findOne.mockResolvedValueOnce(null);
    await store.set(2, data);
    expect(persistAndFlush).toHaveBeenCalled();

    // then emulate stored row
    findOne.mockResolvedValueOnce({ data: JSON.stringify(data) });
    const got = await store.get(2);
    expect(got).toEqual(data);
  });

  it('deletes session', async () => {
    const existing = { data: '{}' };
    findOne.mockResolvedValueOnce(existing);
    await store.delete(3);
    expect(removeAndFlush).toHaveBeenCalledWith(existing);
  });
});
