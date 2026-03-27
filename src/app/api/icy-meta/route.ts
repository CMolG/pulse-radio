/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import {
  NextRequest,
  NextResponse,
} from 'next/server';
import { isStationBlacklisted, recordStationFailure } from '@/lib/server-cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
const _IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const _IPV6_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const _IPV6_BRACKETS_RE = /^\[|\]$/g;
const _TRAILING_NULLS_RE = /\0+$/;
const _STREAM_TITLE_RE = /StreamTitle='([^']*)'/;
/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ function isPrivateHost(
  hostname: string,
): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost')
  ) {
    return true;
  }
  const ipv4Match = host.match(_IPV4_RE);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 0) return true;
  }
  const ipv6 = host.replace(_IPV6_BRACKETS_RE, '');
  if (ipv6.startsWith('fe80:')) return true;
  if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
  if (ipv6 === '::1' || ipv6 === '::') return true;
  const mappedMatch = ipv6.match(_IPV6_MAPPED_RE);
  if (mappedMatch) return isPrivateHost(mappedMatch[1]);
  return false;
}
export const runtime = 'nodejs';
const _ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
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

  const streamUrl = req.nextUrl.searchParams.get('url');
  if (!streamUrl || streamUrl.length > 2048) {
    return NextResponse.json(_ERR_INVALID_PARAM, { status: 400, headers: _CACHE_BAD_REQ });
  }
  try {
    const url = new URL(streamUrl);
    if (!_ALLOWED_PROTOCOLS.has(url.protocol)) {
      return NextResponse.json(_ERR_INVALID_PROTO, { status: 400, headers: _CACHE_BAD_REQ });
    }
    if (isPrivateHost(url.hostname))
      return NextResponse.json(_ERR_PRIVATE_IP, { status: 400, headers: _CACHE_BAD_REQ });
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
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(streamUrl, {
      headers: _ICY_FETCH_HDRS,
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
        icyName: icyName || null,
        icyGenre: icyGenre || null,
        icyBr: icyBr || null,
      }, { headers: _CACHE_OK });
    }
    const metaint = parseInt(icyMetaint, 10);
    const MAX_METAINT = 131072;
    if (isNaN(metaint) || metaint <= 0 || metaint > MAX_METAINT) {
      clearTimeout(timeout);
      res.body.cancel().catch(_NOOP);
      return NextResponse.json({ streamTitle: null, icyName, icyGenre, icyBr }, { headers: _CACHE_OK });
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
      return NextResponse.json({ streamTitle: null, icyName, icyGenre, icyBr }, { headers: _CACHE_OK });
    const metaLength = buffer[metaint] * 16;
    if (metaLength === 0 || buffer.length < metaint + 1 + metaLength) {
      return NextResponse.json({ streamTitle: null, icyName, icyGenre, icyBr }, { headers: _CACHE_OK });
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: _CACHE_ERR });
  }
}
