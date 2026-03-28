/**
 * Unified timeout & retry policy for server-side API fetches.
 * Provides exponential backoff, signal composition, and configurable retry predicates.
 */

export interface FetchRetryOptions {
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
  /** Parent AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Standard fetch() RequestInit options (headers, method, body, etc.). */
  init?: RequestInit;
}

interface RetryContext {
  attempt: number;
  timeout: number;
  retries: number;
  backoff: number;
  maxBackoff: number;
  retryOn: (status?: number, error?: Error) => boolean;
  parentSignal?: AbortSignal;
}

/**
 * Composes a parent AbortSignal with a per-attempt timeout signal.
 * If either fires, the composed signal aborts.
 */
function composeAbortSignals(
  parentSignal: AbortSignal | undefined,
  timeoutMs: number
): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const cleanup = () => clearTimeout(timeoutId);

  if (parentSignal) {
    if (parentSignal.aborted) {
      cleanup();
      controller.abort();
    } else {
      parentSignal.addEventListener("abort", () => {
        cleanup();
        controller.abort();
      });
    }
  }

  return controller.signal;
}

/**
 * Calculates exponential backoff with jitter.
 * Formula: delay * 2^attempt + random(0, delay/2)
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
    return true; // Retry on timeout (AbortError from timeout signal)
  }
  return status ? status >= 500 : false;
}

/**
 * Fetches a URL with automatic retries, exponential backoff, and timeout handling.
 *
 * @param url - The URL to fetch
 * @param options - Retry configuration (timeout, retries, backoff, etc.)
 * @returns The fetch response (last attempt)
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```ts
 * // Metadata route: 8s timeout, 2 retries
 * const res = await fetchWithRetry(url, { timeout: 8000, retries: 2 });
 *
 * // Artwork route: 10s timeout, 1 retry
 * const res = await fetchWithRetry(url, { timeout: 10000, retries: 1 });
 *
 * // With cancellation support
 * const controller = new AbortController();
 * const res = await fetchWithRetry(url, {
 *   timeout: 8000,
 *   retries: 3,
 *   signal: controller.signal,
 * });
 * ```
 */
/**
 * Fetches with all standard fetch() options supported.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions & { init?: RequestInit } = {}
): Promise<Response> {
  const {
    timeout = 8000,
    retries = 3,
    backoff = 1000,
    maxBackoff = 8000,
    retryOn = defaultRetryOn,
    signal: parentSignal,
    init,
  } = options;

  const context: RetryContext = {
    attempt: 0,
    timeout,
    retries,
    backoff,
    maxBackoff,
    retryOn,
    parentSignal,
  };

  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    context.attempt = attempt;

    try {
      const signal = composeAbortSignals(parentSignal, timeout);
      const response = await fetch(url, { ...init, signal });

      // Don't retry on 4xx errors
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Check if we should retry
      if (
        attempt < retries &&
        context.retryOn(response.status, undefined)
      ) {
        const delay = calculateBackoff(backoff, attempt, maxBackoff);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if parent signal aborted
      if (parentSignal?.aborted) {
        throw lastError;
      }

      // Check if we should retry
      if (attempt < retries && context.retryOn(undefined, lastError)) {
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
 * Useful for consistent configuration across a domain.
 *
 * @example
 * ```ts
 * const fetchMetadata = fetchWithRetryFactory({
 *   timeout: 8000,
 *   retries: 2,
 * });
 * const res = await fetchMetadata('https://api.example.com/meta');
 * ```
 */
export function fetchWithRetryFactory(defaults: FetchRetryOptions) {
  return (url: string, options: FetchRetryOptions = {}) =>
    fetchWithRetry(url, { ...defaults, ...options });
}
