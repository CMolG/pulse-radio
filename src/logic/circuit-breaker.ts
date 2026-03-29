/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  successThreshold?: number;
}

export interface CircuitBreaker {
  /** Execute fn through the breaker; returns fallback when OPEN. */
  call<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; state: CircuitState }>;
  state: CircuitState;
}

const DEFAULTS = { failureThreshold: 5, resetTimeoutMs: 30_000, successThreshold: 2 };

export function createCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
  const opts = { ...DEFAULTS, ...config };
  let state: CircuitState = 'CLOSED';
  let failures = 0;
  let successes = 0;
  let lastFailureTime = 0;

  const breaker: CircuitBreaker = {
    get state() {
      // Auto-transition from OPEN → HALF_OPEN after resetTimeout
      if (state === 'OPEN' && Date.now() - lastFailureTime >= opts.resetTimeoutMs) {
        state = 'HALF_OPEN';
        successes = 0;
      }
      return state;
    },

    async call<T>(fn: () => Promise<T>, fallback: T) {
      const current = breaker.state; // triggers auto-transition check

      if (current === 'OPEN') {
        return { data: fallback, state: current };
      }

      try {
        const data = await fn();

        if (current === 'HALF_OPEN') {
          successes++;
          if (successes >= opts.successThreshold) {
            state = 'CLOSED';
            failures = 0;
            successes = 0;
          }
        } else {
          failures = 0;
        }

        return { data, state: breaker.state };
      } catch (_err) {
        // eslint-disable-line @typescript-eslint/no-unused-vars
        failures++;
        lastFailureTime = Date.now();

        if (failures >= opts.failureThreshold || current === 'HALF_OPEN') {
          state = 'OPEN';
        }

        return { data: fallback, state: breaker.state };
      }
    },
  };

  return breaker;
}
