interface LogFunction {
  <T>(object: T, message?: string, ...args: unknown[]): void;
  (message: string, ...args: unknown[]): void;
}

export interface Logger {
  /**
   * Log at `'fatal'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   */
  fatal: LogFunction;
  /**
   * Log at `'error'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   */
  error: LogFunction;
  /**
   * Log at `'warn'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   */
  warn: LogFunction;
  /**
   * Log at `'info'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   */
  info: LogFunction;
  /**
   * Log at `'debug'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   */
  debug: LogFunction;
  /**
   * Log at `'trace'` level the given msg. If the first argument is an object, all its properties will be included in the JSON line.
   */
  trace: LogFunction;
  /**
   * Noop function.
   */
  silent: LogFunction;
}
