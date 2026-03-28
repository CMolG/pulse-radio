/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const HTML_TAGS = /<[^>]*>/g;

/** Sanitize free-text search input for upstream API queries. */
export function sanitizeSearchQuery(input: string): string {
  return input.replace(CONTROL_CHARS, '').replace(HTML_TAGS, '').trim().slice(0, 200);
}

/** Validate and sanitize a URL — returns null if invalid. */
export function sanitizeUrl(input: string): string | null {
  if (input.length > 2048) return null;
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
};
const HTML_ESCAPE_RE = /[<>&"']/g;

/** Sanitize ICY metadata / display strings — strip control chars, escape HTML. */
export function sanitizeMetadata(input: string): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(HTML_ESCAPE_RE, (ch) => HTML_ENTITY_MAP[ch] ?? ch)
    .slice(0, 500);
}

/** Dangerous prototype keys that can pollute Object.prototype. */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Recursively strip dangerous prototype pollution keys from an object. */
export function stripPrototypeKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripPrototypeKeys);
  }

  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (!DANGEROUS_KEYS.has(key)) {
      result[key] = stripPrototypeKeys(value);
    }
  }
  return result;
}

/** Safely parse JSON, stripping dangerous prototype pollution keys. */
export function safeJsonParse<T = unknown>(text: string): T {
  const parsed = JSON.parse(text) as unknown;
  return stripPrototypeKeys(parsed) as T;
}

/** Sanitize HTTP header values — strip CRLF and null bytes to prevent header injection. */
export function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n\x00]/g, '').trim();
}

/** Sanitize text content — strip control characters. */
export function sanitizeTextContent(value: string): string {
  return value.replace(CONTROL_CHARS, '').trim();
}

/** Sanitize user-controlled input before logging to prevent log injection attacks.
 * Strips newlines and control characters to prevent fake log entries from being injected.
 */
export function sanitizeForLog(input: string): string {
  return input
    .replace(/[\r\n]/g, ' ')       // Collapse newlines to spaces
    .replace(/[\x00-\x1f]/g, '')   // Strip control characters
    .slice(0, 200);                // Limit length
}
