import { describe, expect, it, vi } from 'vitest';

import { CommandsRegistry } from '../CommandsRegistry.js';
import { registerCommandsIfNeeded } from '../registerCommands.js';

describe('registerCommandsIfNeeded', () => {
  it('registers commands when shouldRegister=true', async () => {
    const registry = new CommandsRegistry();
    registry.register({ command: 'foo', descriptionKey: 'commands.search' });

    const bot = {
      api: {
        setMyCommands: vi.fn().mockResolvedValue(true),
      },
    } as any;

    const res = await registerCommandsIfNeeded({ bot, commandsRegistry: registry, locale: 'en', shouldRegister: true });
    expect(res).toBe(true);
    expect(bot.api.setMyCommands).toHaveBeenCalledOnce();
    const arg = bot.api.setMyCommands.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg[0].command).toBe('foo');
    expect(typeof arg[0].description).toBe('string');
  });

  it('does nothing when shouldRegister=false', async () => {
    const registry = new CommandsRegistry();
    registry.register({ command: 'foo', descriptionKey: 'commands.search' });

    const bot = {
      api: {
        setMyCommands: vi.fn().mockResolvedValue(true),
      },
    } as any;

    const res = await registerCommandsIfNeeded({ bot, commandsRegistry: registry, locale: 'en', shouldRegister: false });
    expect(res).toBe(false);
    expect(bot.api.setMyCommands).not.toHaveBeenCalled();
  });
});
