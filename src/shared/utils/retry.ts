export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  retryIf?: (err: unknown) => boolean | Promise<boolean>;
  onRetry?: (err: unknown, attempt: number) => void | Promise<void>;
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 0;
  const delayMs = options.delayMs ?? 0;
  const retryIf = options.retryIf ?? (() => true);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error_) {
      lastErr = error_;
      const shouldRetry = attempt < retries && (await retryIf(error_));
      if (!shouldRetry) break;
      if (options.onRetry) {
        try {
          // attempt number is 1-based for callbacks
          await options.onRetry(error_, attempt + 1);
        } catch {
          // ignore callback errors
        }
      }
      if (delayMs > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  throw lastErr;
}
