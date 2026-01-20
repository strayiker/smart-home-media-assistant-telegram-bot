import type { MikroORM } from '@mikro-orm/core';

import { ChatSession } from '../../entities/ChatSession.js';
import { logger } from '../../logger.js';

export interface CleanupHandle {
  stop: () => Promise<void>;
}

// startSessionCleanup will periodically remove expired sessions from DB.
export function startSessionCleanup(
  orm: MikroORM,
  intervalMs = 1000 * 60 * 60,
): CleanupHandle {
  let timer: NodeJS.Timeout | undefined = undefined;
  let stopped = false;

  const runOnce = async () => {
    try {
      const now = new Date();
      const repo = orm.em.getRepository(ChatSession);
      // Remove rows where expiresAt is set and less than now
      await repo.nativeDelete({ expiresAt: { $lt: now } });
      logger.info('Session cleanup completed');
    } catch (error) {
      logger.warn(error, 'Session cleanup failed');
    }
  };

  // Kick off immediately
  void runOnce();

  timer = setInterval(() => {
    void runOnce();
  }, intervalMs);

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (timer) clearInterval(timer as unknown as number);
      timer = undefined;
      // run a final pass
      try {
        await runOnce();
      } catch {
        // ignore
      }
    },
  };
}

export default startSessionCleanup;
