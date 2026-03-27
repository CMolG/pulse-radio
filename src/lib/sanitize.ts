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
