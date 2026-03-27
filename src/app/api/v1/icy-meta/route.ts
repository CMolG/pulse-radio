/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import {
  NextRequest,
  NextResponse,
} from 'next/server';
import { isStationBlacklisted, recordStationFailure } from '@/lib/server-cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { apiError } from '@/lib/api-response';
import { sanitizeUrl, sanitizeTextContent, sanitizeForLog } from '@/lib/sanitize';
import { logRequest } from '@/lib/logger';
import { validateRequest } from '@/lib/validate-request';
import { icyMetaSchema } from '@/lib/validation-schemas';
import { isPrivateHost, ALLOWED_PROTOCOLS, resolveDnsAndValidate } from '@/lib/ssrf';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
import { withApiVersion } from '@/lib/api-versioning';
const _TRAILING_NULLS_RE = /\0+$/;
const _STREAM_TITLE_RE = /StreamTitle='([^']*)'/;
export const runtime = 'nodejs';
const _CACHE_OK = { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' } as const;
const _CACHE_ERR = { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } as const;
const _CACHE_BLACKLIST = { 'Cache-Control': 'public, s-maxage=30' } as const;
const _CACHE_BAD_REQ = { 'Cache-Control': 'public, s-maxage=60' } as const;
const _UTF8_DECODER = new TextDecoder('utf-8');
const _ICY_FETCH_HDRS = { 'Icy-MetaData': '1' } as const;
const _NOOP = () => {};
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.icyMeta);
  if (limited) return limited;
  logRequest(req);

  const validated = validateRequest(icyMetaSchema, req.nextUrl.searchParams);
  if (!validated.success) return apiError('Missing or invalid url parameter', 'INVALID_PARAM', 400, _CACHE_BAD_REQ);
  const streamUrl = sanitizeUrl(validated.data.url);
  if (!streamUrl) return apiError('Missing or invalid url parameter', 'INVALID_PARAM', 400, _CACHE_BAD_REQ);
  try {
    const url = new URL(streamUrl);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return apiError('Invalid protocol', 'INVALID_PARAM', 400, _CACHE_BAD_REQ);
    }
    if (isPrivateHost(url.hostname))
      return apiError('Private/internal URLs not allowed', 'INVALID_PARAM', 400, _CACHE_BAD_REQ);
    try {
      await resolveDnsAndValidate(url.hostname);
    } catch {
      return apiError('Private/internal URLs not allowed', 'INVALID_PARAM', 400, _CACHE_BAD_REQ);
    }
  } catch {
    return apiError('Invalid URL', 'INVALID_PARAM', 400, _CACHE_BAD_REQ);
  }
  // Blacklist check: if station is known to be unreachable, skip immediately
  if (isStationBlacklisted(streamUrl)) {
    return apiError('Station temporarily unavailable', 'BLACKLISTED', 503, { 'X-Station-Blacklisted': 'true', ..._CACHE_BLACKLIST });
  }
  const controller = new AbortController();
  try {
    // Metadata route: 8s timeout, 2 retries
    const res = await fetchWithRetry(streamUrl, {
      timeout: 8000,
      retries: 2,
      init: { headers: _ICY_FETCH_HDRS },
      signal: controller.signal,
    });
    if (res.url) {
      try {
        const finalUrl = new URL(res.url);
        if (isPrivateHost(finalUrl.hostname)) {
          clearTimeout(timeout);
          res.body?.cancel().catch(_NOOP);
      return apiError('Redirect to private IP not allowed', 'INVALID_PARAM', 403, _CACHE_BAD_REQ);
        }
      } catch {
        /* URL parse failed — continue */
      }
    } else {
      clearTimeout(timeout);
      res.body?.cancel().catch(_NOOP);
      return apiError('Redirect target unknown', 'UPSTREAM_ERROR', 400, _CACHE_BAD_REQ);
    }
    if (!res.ok) {
      clearTimeout(timeout);
      res.body?.cancel().catch(_NOOP);
      recordStationFailure(streamUrl);
      return apiError(`Upstream ${res.status}`, 'UPSTREAM_ERROR', 502, _CACHE_ERR);
    }
    const icyMetaint = res.headers.get('icy-metaint');
    const icyName = res.headers.get('icy-name');
    const icyGenre = res.headers.get('icy-genre');
    const icyBr = res.headers.get('icy-br');
    if (!icyMetaint || !res.body) {
      clearTimeout(timeout);
      res.body?.cancel().catch(_NOOP);
      return withApiVersion(NextResponse.json({
        streamTitle: null,
        icyName: icyName ? sanitizeTextContent(icyName) : null,
        icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null,
        icyBr: icyBr || null,
      }, { headers: _CACHE_OK }));
    }
    const metaint = parseInt(icyMetaint, 10);
    const MAX_METAINT = 131072;
    if (isNaN(metaint) || metaint <= 0 || metaint > MAX_METAINT) {
      clearTimeout(timeout);
      res.body.cancel().catch(_NOOP);
      return withApiVersion(NextResponse.json({ streamTitle: null, icyName: icyName ? sanitizeTextContent(icyName) : null, icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null, icyBr }, { headers: _CACHE_OK }));
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalRead = 0;
    const bytesNeeded = metaint + 4096;
    try {
      while (totalRead < bytesNeeded) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalRead += value.length;
      }
    } finally {
      clearTimeout(timeout);
      reader.cancel().catch(_NOOP);
    }
    const buffer = new Uint8Array(totalRead);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    if (buffer.length <= metaint)
      return withApiVersion(NextResponse.json({ streamTitle: null, icyName: icyName ? sanitizeTextContent(icyName) : null, icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null, icyBr }, { headers: _CACHE_OK }));
    const metaLength = buffer[metaint] * 16;
    if (metaLength === 0 || buffer.length < metaint + 1 + metaLength) {
      return withApiVersion(NextResponse.json({ streamTitle: null, icyName: icyName ? sanitizeTextContent(icyName) : null, icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null, icyBr }, { headers: _CACHE_OK }));
    }
    const metaBytes = buffer.slice(metaint + 1, metaint + 1 + metaLength);
    const metaString = _UTF8_DECODER.decode(metaBytes).replace(_TRAILING_NULLS_RE, '');
    const match = metaString.match(_STREAM_TITLE_RE);    const streamTitle = match?.[1]?.trim() || null;
    return withApiVersion(NextResponse.json({ streamTitle, icyName, icyGenre, icyBr }, { headers: _CACHE_OK }));
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    if (isTimeout) {
      recordStationFailure(streamUrl);
      return apiError('Request timed out', 'TIMEOUT', 504, _CACHE_ERR);
    }
    console.error('[icy-meta] Metadata fetch failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
    return apiError('Metadata fetch failed', 'INTERNAL_ERROR', 500, _CACHE_ERR);
  }
}
