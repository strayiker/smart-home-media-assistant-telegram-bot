import { describe, it, expect } from 'vitest';
import { FeatureFlagService } from '../FeatureFlagService.js';

class DummyStore {
  private m = new Map<string, boolean>();
  async get(k: string) {
    return this.m.get(k);
  }
  async set(k: string, v: boolean) {
    this.m.set(k, v);
  }
}

describe('FeatureFlagService', () => {
  it('returns false for unknown flags', async () => {
    const svc = new FeatureFlagService(new DummyStore() as any);
    expect(await svc.isEnabled('nope')).toBe(false);
  });

  it('can set and read flags', async () => {
    const store = new DummyStore();
    const svc = new FeatureFlagService(store as any);
    await svc.setFlag('f1', true);
    expect(await svc.isEnabled('f1')).toBe(true);
    await svc.setFlag('f1', false);
    expect(await svc.isEnabled('f1')).toBe(false);
  });
});
