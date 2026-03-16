/**
 * Poll-based assertion helper for async flows.
 * Useful for waiting on webhook-driven state changes, DB propagation, etc.
 */

export interface WaitForOptions {
  /** Maximum time to wait in ms (default: 30000) */
  timeout?: number;
  /** Polling interval in ms (default: 1000) */
  interval?: number;
  /** Description for timeout error message */
  description?: string;
}

/**
 * Polls `fn` every `interval` until `predicate` returns true or `timeout` is reached.
 * Returns the last result from `fn` when predicate passes.
 * Throws descriptive error on timeout.
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options?: WaitForOptions
): Promise<T> {
  const timeout = options?.timeout ?? 30000;
  const interval = options?.interval ?? 1000;
  const description = options?.description ?? 'condition';

  const startTime = Date.now();
  let lastResult: T | undefined;
  let lastError: Error | undefined;
  let attempts = 0;

  while (Date.now() - startTime < timeout) {
    attempts++;
    try {
      lastResult = await fn();
      if (predicate(lastResult)) {
        return lastResult;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const elapsed = Date.now() - startTime;
  const resultSummary = lastResult !== undefined
    ? `\nLast result: ${JSON.stringify(lastResult, null, 2).slice(0, 500)}`
    : '';
  const errorSummary = lastError
    ? `\nLast error: ${lastError.message}`
    : '';

  throw new Error(
    `waitFor timed out after ${elapsed}ms (${attempts} attempts) waiting for: ${description}` +
    resultSummary +
    errorSummary
  );
}
