/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/services/CacheRepository';
import { ItunesSearchResultSchema } from '@/lib/schemas/api-responses';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { logRequest } from '@/lib/logger';
import { validateRequest } from '@/lib/validate-request';
import { itunesSchema } from '@/lib/validation-schemas';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
import { apiError } from '@/lib/api-response';
import { readJsonWithLimit } from '@/lib/fetch-utils';
import { safeErrorResponse } from '@/lib/api-error-sanitizer';
import { itunesKey } from '@/lib/cache-keys';
export const runtime = 'nodejs';
const _ERR_400 = { error: 'Missing or invalid term parameter', results: [] };
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const itunesCircuit = createCircuitBreaker('itunes');
const _NOOP = () => {};
/* Server-side proxy for iTunes Search API. Avoids any browser-side CORS/CSP issues and allows server caching. */ export async function GET(
  req: NextRequest,
) {
  const limited = rateLimit(req, RATE_LIMITS.itunes);
  if (limited) return limited;
  const reqLog = logRequest(req);

  const validated = validateRequest(itunesSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;
  const term = sanitizeSearchQuery(validated.data.term);
  if (!term) return NextResponse.json(_ERR_400, { status: 400 });
  const media = validated.data.media ?? 'music';
  const isPodcast = media === 'podcast';
  const entity = isPodcast ? 'podcast' : (validated.data.entity ?? 'song');
  const limit = isPodcast ? '20' : '3';
  const cacheKey = itunesKey(term, media);
  try {
    const data = await getCachedOrFetch({
      namespace: 'itunes',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await itunesCircuit.call(async () => {
          const url = `https://itunes.apple.com/search?${new URLSearchParams({ term, media, entity, limit })}`;
          // iTunes route: 8s timeout, 2 retries
          const res = await fetchWithRetry(url, {
            timeout: 8000,
            retries: 2,
            retryOn: (status, error) => {
              if (error?.name === 'AbortError') return true;
              return status ? status >= 500 : false;
            },
          });
          if (!res.ok) {
            throw new Error(`iTunes API returned ${res.status}`);
          }
          return await readJsonWithLimit<unknown>(res, 1 * 1024 * 1024, url);
        }, { resultCount: 0, results: [] });
        return data;
      },
    });
    reqLog.done(200);
    const headers: Record<string, string> = { ..._CACHE_HDRS };
    if (itunesCircuit.state !== 'CLOSED') headers['X-Circuit-State'] = itunesCircuit.state.toLowerCase();
    return NextResponse.json(data, { headers });
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    const status = isTimeout ? 504 : 500;
    reqLog.done(status);
    if (!isTimeout) console.error('[itunes] Search request failed:', e);
    return NextResponse.json(
      {
        error: isTimeout ? 'Request timed out' : 'Search request failed',
        results: [],
        ...(process.env.NODE_ENV !== 'production' && e instanceof Error && { debug: e.message }),
      },
      { status },
    );
  }
}
