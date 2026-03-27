/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import {
  NextRequest,
  NextResponse,
} from 'next/server';
import { isStationBlacklisted, recordStationFailure } from '@/lib/server-cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeUrl, sanitizeTextContent } from '@/lib/sanitize';
import { logRequest } from '@/lib/logger';
import { validateRequest } from '@/lib/validate-request';
import { icyMetaSchema } from '@/lib/validation-schemas';
import { isPrivateHost, ALLOWED_PROTOCOLS, resolveDnsAndValidate } from '@/lib/ssrf';
import { safeErrorResponse } from '@/lib/api-error-sanitizer';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
const _TRAILING_NULLS_RE = /\0+$/;
const _STREAM_TITLE_RE = /StreamTitle='([^']*)'/;
export const runtime = 'nodejs';
const _ERR_INVALID_PARAM = { error: 'Missing or invalid url parameter' } as const;
const _ERR_INVALID_PROTO = { error: 'Invalid protocol' } as const;
const _ERR_PRIVATE_IP = { error: 'Private/internal URLs not allowed' } as const;
const _ERR_REDIRECT_PRIVATE = { error: 'Redirect to private IP not allowed' } as const;
const _ERR_INVALID_URL = { error: 'Invalid URL' } as const;
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
  if (!validated.success) return NextResponse.json(_ERR_INVALID_PARAM, { status: 400, headers: _CACHE_BAD_REQ });
  const streamUrl = sanitizeUrl(validated.data.url);
  if (!streamUrl) return NextResponse.json(_ERR_INVALID_PARAM, { status: 400, headers: _CACHE_BAD_REQ });
  try {
    const url = new URL(streamUrl);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return NextResponse.json(_ERR_INVALID_PROTO, { status: 400, headers: _CACHE_BAD_REQ });
    }
    if (isPrivateHost(url.hostname))
      return NextResponse.json(_ERR_PRIVATE_IP, { status: 400, headers: _CACHE_BAD_REQ });
    try {
      await resolveDnsAndValidate(url.hostname);
    } catch {
      return NextResponse.json(_ERR_PRIVATE_IP, { status: 400, headers: _CACHE_BAD_REQ });
    }
  } catch {
    return NextResponse.json(_ERR_INVALID_URL, { status: 400, headers: _CACHE_BAD_REQ });
  }
  // Blacklist check: if station is known to be unreachable, skip immediately
  if (isStationBlacklisted(streamUrl)) {
    return NextResponse.json(
      { error: 'Station temporarily unavailable', blacklisted: true },
      { status: 503, headers: { 'X-Station-Blacklisted': 'true', ..._CACHE_BLACKLIST } },
    );
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
      return NextResponse.json(_ERR_REDIRECT_PRIVATE, { status: 403, headers: _CACHE_BAD_REQ });
        }
      } catch {
        /* URL parse failed — continue */
      }
    } else {
      clearTimeout(timeout);
      res.body?.cancel().catch(_NOOP);
      return NextResponse.json({ error: 'Redirect target unknown' }, { status: 400, headers: _CACHE_BAD_REQ });
    }
    if (!res.ok) {
      clearTimeout(timeout);
      res.body?.cancel().catch(_NOOP);
      recordStationFailure(streamUrl);
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502, headers: _CACHE_ERR });
    }
    const icyMetaint = res.headers.get('icy-metaint');
    const icyName = res.headers.get('icy-name');
    const icyGenre = res.headers.get('icy-genre');
    const icyBr = res.headers.get('icy-br');
    if (!icyMetaint || !res.body) {
      clearTimeout(timeout);
      res.body?.cancel().catch(_NOOP);
      return NextResponse.json({
        streamTitle: null,
        icyName: icyName ? sanitizeTextContent(icyName) : null,
        icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null,
        icyBr: icyBr || null,
      }, { headers: _CACHE_OK });
    }
    const metaint = parseInt(icyMetaint, 10);
    const MAX_METAINT = 131072;
    if (isNaN(metaint) || metaint <= 0 || metaint > MAX_METAINT) {
      clearTimeout(timeout);
      res.body.cancel().catch(_NOOP);
      return NextResponse.json({ streamTitle: null, icyName: icyName ? sanitizeTextContent(icyName) : null, icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null, icyBr }, { headers: _CACHE_OK });
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
      return NextResponse.json({ streamTitle: null, icyName: icyName ? sanitizeTextContent(icyName) : null, icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null, icyBr }, { headers: _CACHE_OK });
    const metaLength = buffer[metaint] * 16;
    if (metaLength === 0 || buffer.length < metaint + 1 + metaLength) {
      return NextResponse.json({ streamTitle: null, icyName: icyName ? sanitizeTextContent(icyName) : null, icyGenre: icyGenre ? sanitizeTextContent(icyGenre) : null, icyBr }, { headers: _CACHE_OK });
    }
    const metaBytes = buffer.slice(metaint + 1, metaint + 1 + metaLength);
    const metaString = _UTF8_DECODER.decode(metaBytes).replace(_TRAILING_NULLS_RE, '');
    const match = metaString.match(_STREAM_TITLE_RE);    const streamTitle = match?.[1]?.trim() || null;
    return NextResponse.json({ streamTitle, icyName, icyGenre, icyBr }, { headers: _CACHE_OK });
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    if (isTimeout) {
      recordStationFailure(streamUrl);
      return NextResponse.json({ error: 'Request timed out' }, { status: 504, headers: _CACHE_ERR });
    }
    console.error('[icy-meta] Metadata fetch failed:', err);
    return NextResponse.json(safeErrorResponse('Metadata fetch failed', err), { status: 500, headers: _CACHE_ERR });
  }
}
