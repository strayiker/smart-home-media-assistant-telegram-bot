import { container } from '../../../di.js';
import type { MyContext } from '../../../Context.js';

/**
 * Middleware to inject DI container into the context.
 * Allows handlers to resolve services via ctx.resolve<T>(key).
 */
export function createDIContainerMiddleware() {
  return async (ctx: MyContext, next: () => Promise<unknown>) => {
    // Attach container resolve method to context
    ctx.resolve = <T = unknown>(key: string): T => {
      return container.resolve<T>(key);
    };
    return next();
  };
}
