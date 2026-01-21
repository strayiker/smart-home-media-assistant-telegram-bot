import type { Config, ConfigGetOptions, ConfigGetResult } from './Config.js';

export class ConfigEnv implements Config {
  get<T, Required extends boolean = false, Parse extends boolean = false>(
    name: string,
    options?: ConfigGetOptions<T, Required, Parse>,
  ): ConfigGetResult<T, Required, Parse> {
    const value = process.env[name];

    if (!value) {
      if (options?.required) {
        throw new Error(`"${name}" environment variable is required.`);
      }
      return options?.default as ConfigGetResult<T, Required, Parse>;
    }

    return options?.parse
      ? JSON.parse(value)
      : (value as ConfigGetResult<T, Required, Parse>);
  }
}
