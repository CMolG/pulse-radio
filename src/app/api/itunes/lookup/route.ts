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
import { logRequest } from '@/lib/logger';
import { validateRequest } from '@/lib/validate-request';
import { itunesLookupSchema } from '@/lib/validation-schemas';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
export const runtime = 'nodejs';
const _ERR_400 = { error: 'Missing or invalid id parameter', results: [] };
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400' };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const itunesCircuit = createCircuitBreaker('itunes-lookup');
/* Server-side proxy for iTunes Lookup API. Returns songs for a given collectionId. */ export async function GET(
  req: NextRequest,
) {
  const limited = rateLimit(req, RATE_LIMITS.itunes);
  if (limited) return limited;
  const reqLog = logRequest(req);

  const validated = validateRequest(itunesLookupSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;
  const { id } = validated.data;
  const cacheKey = `lookup:${id}`;
  try {
    const data = await cacheResolve<unknown>({
      namespace: 'itunes',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await itunesCircuit.call(async () => {
          const url = `https://itunes.apple.com/lookup?${new URLSearchParams({ id, entity: 'song' })}`;
          const res = await apiFetch(url, {
            timeoutMs: 8_000,
            maxBytes: 2 * 1024 * 1024,
            label: 'iTunes Lookup API',
          });
          const json = await res.json();
          // Filter out the album entry (wrapperType=collection), keep only tracks
          return { ...json, results: (json.results ?? []).filter((r: { wrapperType?: string }) => r.wrapperType === 'track') };
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
    return NextResponse.json(
      {
        error: isTimeout ? 'Request timed out' : e instanceof Error ? e.message : 'Internal error',
        results: [],
      },
      { status },
    );
  }
}
