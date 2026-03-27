/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

const IS_PROD = process.env.NODE_ENV === 'production';

function fmt(level: string, event: string, data?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, event, ...data };
  return IS_PROD ? JSON.stringify(entry) : `[${entry.timestamp}] ${level.toUpperCase()} ${event} ${data ? JSON.stringify(data, null, 2) : ''}`;
}

export const logger = {
  info(event: string, data?: Record<string, unknown>) {
    console.log(fmt('info', event, data));
  },

  warn(event: string, data?: Record<string, unknown>) {
    console.warn(fmt('warn', event, data));
  },

  error(event: string, error?: unknown, data?: Record<string, unknown>) {
    const errData: Record<string, unknown> = { ...data };
    if (error instanceof Error) {
      errData.message = error.message;
      errData.stack = error.stack?.split('\n').slice(0, 5).join('\n');
    } else if (error !== undefined) {
      errData.message = String(error);
    }
    console.error(fmt('error', event, errData));
  },

  /** Development-only debug logging (no-op in production). */
  debug(event: string, data?: Record<string, unknown>) {
    if (!IS_PROD) console.log(fmt('debug', event, data));
  },
};

/** Generate a unique request ID for correlation. */
export function requestId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

/**
 * Log API request start/end. Call at route handler entry; returns a
 * `done(status)` function to log completion with duration.
 */
export function logRequest(req: { method: string; nextUrl: { pathname: string } }, reqId?: string) {
  const id = reqId ?? requestId();
  const start = performance.now();
  const path = req.nextUrl.pathname;
  logger.info('request_start', { requestId: id, method: req.method, path });
  return {
    requestId: id,
    done(status: number) {
      const durationMs = Math.round(performance.now() - start);
      logger.info('request_end', { requestId: id, path, status, durationMs });
    },
  };
}
