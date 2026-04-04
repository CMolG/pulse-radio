/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import {
  NextRequest,
  NextResponse,
} from 'next/server';
import { cacheResolve } from '@/logic/services/cache-repository';
import { rateLimit, RATE_LIMITS } from '@/logic/rate-limiter';
import { sanitizeForLog } from '@/logic/sanitize';
import { logRequest } from '@/logic/logger';
import { validateRequest } from '@/logic/validate-request';
import { librivoxAudiobooksSchema } from '@/logic/validation-schemas';
import { createCircuitBreaker } from '@/logic/circuit-breaker';
import { fetchWithRetry } from '@/logic/fetch-with-retry';
import { apiError } from '@/logic/api-response';
import { readJsonWithLimit } from '@/logic/fetch-utils';
import { librivoxAudiobooksKey } from '@/logic/cache-keys';
import { withApiVersion } from '@/logic/api-versioning';
import { normalizeBooks } from '@/logic/librivox-api';
export const runtime = 'nodejs';
const _CACHE_HDRS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const librivoxCircuit = createCircuitBreaker('librivox-audiobooks');

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.librivox);
  if (limited) return limited;
  const reqLog = logRequest(req);

  const validated = validateRequest(librivoxAudiobooksSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;

  const { title, author, genre, id, since, limit, offset } = validated.data;
  const params: Record<string, string> = {
    format: 'json',
    extended: '1',
    coverart: '1',
    limit: String(limit ?? 20),
    offset: String(offset ?? 0),
  };
  if (title) params.title = title;
  if (author) params.author = author;
  if (genre) params.genre = genre;
  if (id) params.id = id;
  if (since) params.since = since;

  const cacheKey = librivoxAudiobooksKey({
    title,
    author,
    genre,
    id,
    since,
    limit: limit != null ? String(limit) : undefined,
    offset: offset != null ? String(offset) : undefined,
  });

  try {
    const data = await cacheResolve({
      namespace: 'librivox',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await librivoxCircuit.call(
          async () => {
            const url = `https://librivox.org/api/feed/audiobooks?${new URLSearchParams(params)}`;
            const res = await fetchWithRetry(url, {
              timeout: 10000,
              retries: 2,
              retryOn: (status, error) => {
                if (error?.name === 'AbortError') return true;
                return status ? status >= 500 : false;
              },
            });
            if (!res.ok) {
              throw new Error(`LibriVox API returned ${res.status}`);
            }
            return await readJsonWithLimit<unknown>(res, 2 * 1024 * 1024, url);
          },
          { books: [] },
        );
        return data;
      },
    });
    const books = normalizeBooks(data);
    reqLog.done(200);
    const headers: Record<string, string> = { ..._CACHE_HDRS };
    if (librivoxCircuit.state !== 'CLOSED')
      headers['X-Circuit-State'] = librivoxCircuit.state.toLowerCase();
    return withApiVersion(NextResponse.json({ books }, { headers }));
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    const status = isTimeout ? 504 : 500;
    reqLog.done(status);
    if (!isTimeout)
      console.error(
        '[librivox] Audiobooks request failed:',
        sanitizeForLog(e instanceof Error ? e.message : String(e)),
      );
    return apiError(
      isTimeout ? 'Request timed out' : 'Audiobooks request failed',
      isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      status,
    );
  }
}
