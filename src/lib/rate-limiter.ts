import type { NextRequest } from 'next/server';

export interface RateLimitConfig {
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, WindowEntry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup(now: number, windowMs: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > windowMs) {
      store.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

/**
 * Check rate limit for a request. Returns null if allowed,
 * or a 429 Response if the limit has been exceeded.
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
): Response | null {
  const { limit, windowMs } = config;
  const now = Date.now();
  const ip = getClientIp(request);
  const route = request.nextUrl.pathname;
  const key = `${ip}:${route}`;

  cleanup(now, windowMs);

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    const retryAfter = Math.ceil(
      (entry.windowStart + windowMs - now) / 1000,
    );
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  return null;
}

/** Pre-built configs for each API route (per IP, per minute). */
export const RATE_LIMITS = {
  proxyStream: { limit: 10, windowMs: 60_000 },
  icyMeta: { limit: 60, windowMs: 60_000 },
  itunes: { limit: 30, windowMs: 60_000 },
  lyrics: { limit: 30, windowMs: 60_000 },
  artistInfo: { limit: 20, windowMs: 60_000 },
  concerts: { limit: 20, windowMs: 60_000 },
  cronSync: { limit: 2, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;
