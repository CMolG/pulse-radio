/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ const _NOOP = () => {};
async function apiFetch(
  url: string,
  opts: { timeoutMs: number; maxBytes?: number; init?: RequestInit; label?: string },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, { ...opts.init, signal: controller.signal });
    if (!res.ok) {
      await res.text().catch(_NOOP);
      throw new Error(`${opts.label ?? 'Upstream'} returned ${res.status}`);
    }
    if (opts.maxBytes) {
      const cl = res.headers.get('content-length');
      if (cl && parseInt(cl, 10) > opts.maxBytes) {
        await res.body?.cancel().catch(_NOOP);
        throw new Error('Response too large');
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/lib/services/CacheRepository';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { logRequest } from '@/lib/logger';
export const runtime = 'nodejs';
const _ERR_400 = { error: 'Missing or invalid term parameter', results: [] };
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
/* Server-side proxy for iTunes Search API. Avoids any browser-side CORS/CSP issues and allows server caching. */ export async function GET(
  req: NextRequest,
) {
  const limited = rateLimit(req, RATE_LIMITS.itunes);
  if (limited) return limited;
  const reqLog = logRequest(req);

  const rawTerm = req.nextUrl.searchParams.get('term');
  const term = rawTerm ? sanitizeSearchQuery(rawTerm) : '';
  if (!term) {
    return NextResponse.json(_ERR_400, { status: 400 });
  }
  const isPodcast = req.nextUrl.searchParams.get('media') === 'podcast';
  const media = isPodcast ? 'podcast' : 'music';
  const entity = isPodcast ? 'podcast' : 'song';
  const limit = isPodcast ? '20' : '3';
  const cacheKey = `${media}:${term.toLowerCase().trim()}`;
  try {
    const data = await cacheResolve<unknown>({
      namespace: 'itunes',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const url = `https://itunes.apple.com/search?${new URLSearchParams({ term, media, entity, limit })}`;
        const res = await apiFetch(url, {
          timeoutMs: 8_000,
          maxBytes: 2 * 1024 * 1024,
          label: 'iTunes API',
        });
        return await res.json();
      },
    });
    reqLog.done(200);
    return NextResponse.json(data, { headers: _CACHE_HDRS });
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    const status = isTimeout ? 504 : 500;
    reqLog.done(status);
    return NextResponse.json(
      {
        error: isTimeout ? 'Request timed out' : e instanceof Error ? e.message : 'Internal error',
        results: [],
      },
      { status },
    );
  }
}
