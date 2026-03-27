/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * Sanitize error messages for API responses.
 * In production, returns generic public message. In development, includes full error.
 */
export function safeErrorResponse(publicMessage: string, internalError?: unknown) {
  if (internalError && process.env.NODE_ENV !== 'production') {
    const errorStr = internalError instanceof Error ? internalError.message : String(internalError);
    return { error: publicMessage, debug: errorStr };
  }
  return { error: publicMessage };
}
