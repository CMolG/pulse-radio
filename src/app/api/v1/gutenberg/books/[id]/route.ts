/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/logic/services/cache-repository';
import { rateLimit, RATE_LIMITS } from '@/logic/rate-limiter';
import { sanitizeForLog } from '@/logic/sanitize';
import { logRequest } from '@/logic/logger';
import { createCircuitBreaker } from '@/logic/circuit-breaker';
import { fetchWithRetry } from '@/logic/fetch-with-retry';
import { apiError } from '@/logic/api-response';
import { readJsonWithLimit } from '@/logic/fetch-utils';
import { gutenbergBookKey } from '@/logic/cache-keys';
import { withApiVersion } from '@/logic/api-versioning';
import { normalizeBook, type GutendexSearchResult } from '@/logic/gutenberg-api';

export const runtime = 'nodejs';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const _CACHE_HDRS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};
const catalogCircuit = createCircuitBreaker('gutenberg-catalog');

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, RATE_LIMITS.gutenberg);
  if (limited) return limited;

  const reqLog = logRequest(req);
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return apiError('Invalid book ID', 'INVALID_PARAM', 400);
  }

  const cacheKey = gutenbergBookKey(id);

  try {
    const data = await cacheResolve({
      namespace: 'gutenberg',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await catalogCircuit.call(async () => {
          const url = `https://gutendex.com/books/${id}`;
          const res = await fetchWithRetry(url, {
            timeout: 10000,
            retries: 2,
          });
          if (res.status === 404) return null;
          if (!res.ok) throw new Error(`Gutendex API returned ${res.status}`);
          const raw = await readJsonWithLimit<GutendexSearchResult['results'][number]>(
            res,
            1 * 1024 * 1024,
            url,
          );
          return raw ? normalizeBook(raw) : null;
        }, null);
        return data;
      },
    });

    if (!data) {
      reqLog.done(404);
      return apiError('Book not found', 'NOT_FOUND', 404);
    }

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
        '[gutenberg] Book fetch failed:',
        sanitizeForLog(e instanceof Error ? e.message : String(e)),
      );
    return apiError(
      isTimeout ? 'Request timed out' : 'Book fetch failed',
      isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      status,
    );
  }
}
