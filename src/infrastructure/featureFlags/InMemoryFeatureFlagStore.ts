import type { FeatureFlagStore } from '../../domain/services/FeatureFlagService.js';

export class InMemoryFeatureFlagStore implements FeatureFlagStore {
  private map: Map<string, boolean> = new Map();

  async get(flag: string): Promise<boolean | undefined> {
    return this.map.get(flag);
  }

  async set(flag: string, value: boolean): Promise<void> {
    this.map.set(flag, value);
  }
}

export default InMemoryFeatureFlagStore;
