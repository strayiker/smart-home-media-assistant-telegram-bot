import type { Bot } from 'grammy';

import type { MyContext } from '../../shared/context.js';
import { logger } from '../../logger.js';
import type { CommandsRegistry } from './commandsRegistry.js';

export async function registerCommandsIfNeeded(opts: {
  bot: Bot<MyContext>;
  commandsRegistry: CommandsRegistry;
  locale?: string;
  shouldRegister?: boolean;
}) {
  const { bot, commandsRegistry, locale = 'en', shouldRegister = false } = opts;
  if (!shouldRegister) return false;

  const raw = commandsRegistry.getCommands(locale);
  const commands = raw.map((c) => ({ command: c.command, description: c.description }));
  if (commands.length === 0) return false;

  try {
    await bot.api.setMyCommands(commands);
    logger.info('Registered %d bot commands', commands.length);
    return true;
  } catch (error) {
    logger.warn(error, 'Failed to register bot commands');
    return false;
  }
}

export default registerCommandsIfNeeded;
