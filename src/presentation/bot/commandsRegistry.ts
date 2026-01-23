import { fluent } from '../../shared/fluent.js';

interface CommandEntry {
  command: string;
  descriptionKey: string;
  scope?: unknown;
}

export class CommandsRegistry {
  private map = new Map<string, CommandEntry>();

  register(entry: CommandEntry) {
    const key = entry.command;
    if (!key || typeof key !== 'string') return;
    if (this.map.has(key)) return; // dedupe
    this.map.set(key, entry);
  }

  clear() {
    this.map.clear();
  }

  /**
   * Returns commands localized for the given locale.
   * If fluent cannot translate, falls back to descriptionKey.
   */
  getCommands(
    locale = 'en',
  ): Array<{ command: string; description: string; scope?: unknown }> {
    const out: Array<{
      command: string;
      description: string;
      scope?: unknown;
    }> = [];
    for (const entry of this.map.values()) {
      let description = entry.descriptionKey;
      try {
        // Prefer fluent.withLocale(...) translator used across the codebase
        const anyFluent = fluent as unknown as { withLocale?: unknown };
        const withLocale = anyFluent.withLocale as unknown as (
          l: string,
        ) => unknown;
        if (typeof withLocale === 'function') {
          const t = withLocale.call(fluent, locale) as unknown;
          if (typeof t === 'function') {
            description =
              (t as (id: string) => string)(entry.descriptionKey) ??
              description;
          }
        } else {
          // Fallback to common method names
          const anyF = fluent as unknown as { [k: string]: unknown };
          const methods = ['format', 'get', 'translate'] as const;
          for (const method of methods) {
            const fn = anyF[method];
            if (typeof fn === 'function') {
              description =
                (fn as (id: string, l?: string) => string).call(
                  fluent,
                  entry.descriptionKey,
                  locale,
                ) ?? description;
              break;
            }
          }
        }
      } catch {
        // ignore and use descriptionKey
      }

      // Telegram limits description to 256 chars
      if (description.length > 256)
        description = description.slice(0, 253) + '...';

      out.push({ command: entry.command, description, scope: entry.scope });
    }
    return out;
  }
}

export default CommandsRegistry;
