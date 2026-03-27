/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

// Future integration point: replace console.error with Sentry, Datadog,
// or a custom /api/errors endpoint.

export function logError(error: Error, context?: Record<string, unknown>): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      ...(context && { context }),
    }),
  );
}

/** Attach global listeners for uncaught errors. Call once at app startup. */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    logError(error, { type: 'unhandledrejection' });
  });

  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      logError(event.error, { type: 'uncaughtError', filename: event.filename });
    }
  });
}
