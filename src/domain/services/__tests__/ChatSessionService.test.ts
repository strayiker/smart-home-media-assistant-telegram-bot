import { describe, it, expect, beforeEach } from 'vitest';
import { InMemorySessionStore } from '../../../infrastructure/session/InMemorySessionStore.js';

describe('InMemorySessionStore', () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it('sets and gets session data', async () => {
    await store.set(1, { foo: 'bar' });
    const data = await store.get(1);
    expect(data).toEqual({ foo: 'bar' });
  });

  it('returns null for missing sessions', async () => {
    const data = await store.get(999);
    expect(data).toBeNull();
  });

  it('deletes session data', async () => {
    await store.set(2, { a: 1 });
    await store.delete(2);
    expect(await store.get(2)).toBeNull();
  });

  it('clears all sessions', async () => {
    await store.set(3, { x: 'y' });
    await store.set(4, { z: true });
    await store.clear();
    expect(await store.get(3)).toBeNull();
    expect(await store.get(4)).toBeNull();
  });
});
