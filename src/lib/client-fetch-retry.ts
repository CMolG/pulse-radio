/**
 * Client-side fetch retry utility with offline awareness.
 * Lighter version without server-side AbortSignal composition.
 */

export interface ClientFetchRetryOptions {
  /** Per-request timeout in milliseconds. Default: 8000 */
  timeout?: number;
  /** Maximum retry attempts. Default: 3 */
  retries?: number;
  /** Initial backoff in milliseconds. Default: 1000 */
  backoff?: number;
  /** Maximum backoff cap in milliseconds. Default: 8000 */
  maxBackoff?: number;
  /**
   * Predicate to determine if a response/error should be retried.
   * Default: retry on 5xx status codes and timeout errors.
   */
  retryOn?: (status?: number, error?: Error) => boolean;
}

/**
 * Calculates exponential backoff with jitter.
 */
function calculateBackoff(
  baseDelay: number,
  attempt: number,
  maxBackoff: number
): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * (baseDelay / 2);
  return Math.min(exponential + jitter, maxBackoff);
}

/**
 * Default retry predicate: retry on 5xx status codes and timeout errors.
 */
function defaultRetryOn(status?: number, error?: Error): boolean {
  if (error?.name === "AbortError") {
    return true; // Retry on timeout
  }
  return status ? status >= 500 : false;
}

/**
 * Client-side fetch with automatic retries, exponential backoff, and offline awareness.
 *
 * Skips retries entirely if `navigator.onLine` is false (offline).
 * Does not compose parent abort signals (simpler for client-side use).
 *
 * @param url - The URL to fetch
 * @param options - Retry configuration
 * @returns The fetch response (last attempt)
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```ts
 * try {
 *   const res = await clientFetchWithRetry('/api/metadata', {
 *     timeout: 8000,
 *     retries: 2,
 *   });
 * } catch (error) {
 *   console.error('Fetch failed:', error);
 * }
 * ```
 */
export async function clientFetchWithRetry(
  url: string,
  options: ClientFetchRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 8000,
    retries = 3,
    backoff = 1000,
    maxBackoff = 8000,
    retryOn = defaultRetryOn,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Check if offline; if so, don't retry
      if (!navigator.onLine && attempt > 0) {
        throw new Error("Device is offline");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        // Don't retry on 4xx errors
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Check if we should retry
        if (attempt < retries && retryOn(response.status, undefined)) {
          const delay = calculateBackoff(backoff, attempt, maxBackoff);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < retries && retryOn(undefined, lastError)) {
        const delay = calculateBackoff(backoff, attempt, maxBackoff);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // No more retries or not retryable
      throw lastError;
    }
  }

  // This should not be reached, but for safety
  throw lastError || new Error("Fetch failed after all retries");
}

/**
 * Creates a fetch wrapper with preset timeout and retry values.
 *
 * @example
 * ```ts
 * const fetchMetadata = clientFetchWithRetryFactory({
 *   timeout: 8000,
 *   retries: 2,
 * });
 * const res = await fetchMetadata('/api/metadata');
 * ```
 */
export function clientFetchWithRetryFactory(
  defaults: ClientFetchRetryOptions
) {
  return (url: string, options: ClientFetchRetryOptions = {}) =>
    clientFetchWithRetry(url, { ...defaults, ...options });
}
