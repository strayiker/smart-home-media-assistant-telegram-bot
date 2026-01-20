export interface FeatureFlagStore {
  get(flag: string): Promise<boolean | undefined>;
  set(flag: string, value: boolean): Promise<void>;
}

export class FeatureFlagService {
  private store: FeatureFlagStore;

  constructor(store: FeatureFlagStore) {
    this.store = store;
  }

  async isEnabled(flag: string): Promise<boolean> {
    const v = await this.store.get(flag);
    return Boolean(v === true);
  }

  async setFlag(flag: string, enabled: boolean): Promise<void> {
    await this.store.set(flag, enabled);
  }
}

export default FeatureFlagService;
