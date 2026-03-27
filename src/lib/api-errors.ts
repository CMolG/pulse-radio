/**
 * Standardized error response helper for API routes.
 * Returns a safe public message in production; includes debug info in development.
 */
export function safeErrorResponse(status: number, publicMessage: string, internalError?: unknown) {
  if (internalError && process.env.NODE_ENV !== 'production') {
    return { error: publicMessage, debug: String(internalError) };
  }
  return { error: publicMessage };
}
