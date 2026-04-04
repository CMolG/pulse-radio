/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/logic/services/cache-repository';
import { rateLimit, RATE_LIMITS } from '@/logic/rate-limiter';
import { sanitizeSearchQuery, sanitizeForLog } from '@/logic/sanitize';
import { logRequest } from '@/logic/logger';
import { validateRequest } from '@/logic/validate-request';
import { gutenbergBooksSchema } from '@/logic/validation-schemas';
import { createCircuitBreaker } from '@/logic/circuit-breaker';
import { fetchWithRetry } from '@/logic/fetch-with-retry';
import { apiError } from '@/logic/api-response';
import { readJsonWithLimit } from '@/logic/fetch-utils';
import { gutenbergBooksKey } from '@/logic/cache-keys';
import { withApiVersion } from '@/logic/api-versioning';
import { normalizeSearchResult, type GutendexSearchResult } from '@/logic/gutenberg-api';

export const runtime = 'nodejs';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const _CACHE_HDRS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};
const catalogCircuit = createCircuitBreaker('gutenberg-catalog');

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.gutenberg);
  if (limited) return limited;

  const reqLog = logRequest(req);

  const validated = validateRequest(gutenbergBooksSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;

  const { search, topic, language, page } = validated.data;
  const sanitizedSearch = search ? sanitizeSearchQuery(search) : undefined;

  const cacheKey = gutenbergBooksKey({
    search: sanitizedSearch,
    topic,
    language: language ?? 'en',
    page: page ? String(page) : undefined,
  });

  try {
    const data = await cacheResolve({
      namespace: 'gutenberg',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await catalogCircuit.call(
          async () => {
            const params = new URLSearchParams();
            if (sanitizedSearch) params.set('search', sanitizedSearch);
            if (topic) params.set('topic', topic);
            params.set('languages', language ?? 'en');
            if (page) params.set('page', String(page));
            params.set('sort', 'popular');

            const url = `https://gutendex.com/books?${params}`;
            const res = await fetchWithRetry(url, {
              timeout: 10000,
              retries: 2,
            });
            if (!res.ok) throw new Error(`Gutendex API returned ${res.status}`);
            return await readJsonWithLimit<GutendexSearchResult>(res, 2 * 1024 * 1024, url);
          },
          { count: 0, next: null, previous: null, results: [] } as GutendexSearchResult,
        );
        return data ? normalizeSearchResult(data) : null;
      },
    });

    reqLog.done(200);
    const headers: Record<string, string> = { ..._CACHE_HDRS };
    if (catalogCircuit.state !== 'CLOSED')
      headers['X-Circuit-State'] = catalogCircuit.state.toLowerCase();
    return withApiVersion(NextResponse.json(data, { headers }));
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    const status = isTimeout ? 504 : 500;
    reqLog.done(status);
    if (!isTimeout)
      console.error(
        '[gutenberg] Search failed:',
        sanitizeForLog(e instanceof Error ? e.message : String(e)),
      );
    return apiError(
      isTimeout ? 'Request timed out' : 'Search request failed',
      isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      status,
    );
  }
}
