/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/logic/services/cache-repository';
import { rateLimit, RATE_LIMITS } from '@/logic/rate-limiter';
import { sanitizeForLog } from '@/logic/sanitize';
import { logRequest } from '@/logic/logger';
import { validateRequest } from '@/logic/validate-request';
import { gutenbergBookContentSchema } from '@/logic/validation-schemas';
import { createCircuitBreaker } from '@/logic/circuit-breaker';
import { fetchWithRetry } from '@/logic/fetch-with-retry';
import { apiError } from '@/logic/api-response';
import { readJsonWithLimit } from '@/logic/fetch-utils';
import { gutenbergBookKey, gutenbergContentKey } from '@/logic/cache-keys';
import { withApiVersion } from '@/logic/api-versioning';
import {
  normalizeBook,
  type BookContentPayload,
  type GutendexSearchResult,
} from '@/logic/gutenberg-api';
import { parseGutenbergText } from '@/logic/parsers/gutenberg-text';

export const runtime = 'nodejs';

const CONTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BOOK_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const _CACHE_HDRS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
};
const catalogCircuit = createCircuitBreaker('gutenberg-catalog');
const contentCircuit = createCircuitBreaker('gutenberg-content');

const MAX_TEXT_BYTES = 10 * 1024 * 1024; // 10MB limit for book text

async function fetchBookMeta(id: string) {
  return cacheResolve({
    namespace: 'gutenberg',
    key: gutenbergBookKey(id),
    ttlMs: BOOK_CACHE_TTL_MS,
    fetcher: async () => {
      const { data } = await catalogCircuit.call(async () => {
        const url = `https://gutendex.com/books/${id}`;
        const res = await fetchWithRetry(url, { timeout: 10000, retries: 2 });
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
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req, RATE_LIMITS.gutenberg);
  if (limited) return limited;

  const reqLog = logRequest(req);
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    return apiError('Invalid book ID', 'INVALID_PARAM', 400);
  }

  const validated = validateRequest(gutenbergBookContentSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;

  const format = validated.data.format ?? 'text';
  const pageSize = validated.data.pageSize ?? 2000;
  const cacheKey = gutenbergContentKey(id, format, pageSize);

  try {
    const data = await cacheResolve<BookContentPayload>({
      namespace: 'gutenberg',
      key: cacheKey,
      ttlMs: CONTENT_CACHE_TTL_MS,
      fetcher: async () => {
        const book = await fetchBookMeta(id);
        if (!book) return null;

        const textUrl = format === 'html' ? book.readableHtmlUrl : book.readableTextUrl;
        if (!textUrl) return null;

        const { data: rawText } = await contentCircuit.call(
          async () => {
            const res = await fetchWithRetry(textUrl, {
              timeout: 15000,
              retries: 2,
            });
            if (!res.ok) throw new Error(`Gutenberg content returned ${res.status}`);

            const reader = res.body?.getReader();
            if (!reader) return null;

            const chunks: Uint8Array[] = [];
            let totalBytes = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              totalBytes += value.byteLength;
              if (totalBytes > MAX_TEXT_BYTES) {
                reader.cancel();
                throw new Error('Book text too large');
              }
              chunks.push(value);
            }
            return new TextDecoder().decode(Buffer.concat(chunks));
          },
          null as string | null,
        );

        if (!rawText) return null;

        const pages = parseGutenbergText(rawText, pageSize);
        const totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);

        return {
          book,
          pages,
          totalPages: pages.length,
          estimatedReadMinutes: Math.max(1, Math.round(totalWords / 250)),
        };
      },
    });

    if (!data) {
      reqLog.done(404);
      return apiError('Book content not available', 'NOT_FOUND', 404);
    }

    reqLog.done(200);
    const headers: Record<string, string> = { ..._CACHE_HDRS };
    if (contentCircuit.state !== 'CLOSED')
      headers['X-Circuit-State'] = contentCircuit.state.toLowerCase();
    return withApiVersion(NextResponse.json(data, { headers }));
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    const status = isTimeout ? 504 : 500;
    reqLog.done(status);
    if (!isTimeout)
      console.error(
        '[gutenberg] Content fetch failed:',
        sanitizeForLog(e instanceof Error ? e.message : String(e)),
      );
    return apiError(
      isTimeout ? 'Request timed out' : 'Content fetch failed',
      isTimeout ? 'TIMEOUT' : 'UPSTREAM_ERROR',
      status,
    );
  }
}
