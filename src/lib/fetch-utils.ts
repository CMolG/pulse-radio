/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { safeJsonParse } from './sanitize';

/**
 * Reads a Response body as JSON with a hard byte-level size limit.
 * Protects against OOM from chunked, compressed, or oversized responses.
 */
export async function readJsonWithLimit<T>(
  res: Response,
  maxBytes: number = 2 * 1024 * 1024,
  url?: string,
): Promise<T | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        console.warn(`[fetch] Response exceeded ${maxBytes} bytes from ${url ?? 'unknown'}`);
        reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const text = new TextDecoder().decode(Buffer.concat(chunks));
  return safeJsonParse<T>(text);
}
