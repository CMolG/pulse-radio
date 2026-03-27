/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import { NextRequest } from 'next/server';
import { isStationBlacklisted, recordStationFailure, clearStationFailures } from '@/lib/server-cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
const _IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const _IPV6_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const _IPV6_BRACKETS_RE = /^\[|\]$/g;
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
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_DURATION_MS = 0;
const _JSON_HDRS = { 'Content-Type': 'application/json' } as const;
const _JSON_R3_HDRS = { 'Content-Type': 'application/json', 'Retry-After': '3' } as const;
const _JSON_R5_HDRS = { 'Content-Type': 'application/json', 'Retry-After': '5' } as const;
const _JSON_BL_HDRS = { 'Content-Type': 'application/json', 'X-Station-Blacklisted': 'true' } as const;
const _UPSTREAM_HDRS = { 'User-Agent': 'JavadabaRadio/1.0', 'Icy-MetaData': '0' } as const;
const _ERR_MISSING_URL = JSON.stringify({ error: 'Missing or invalid url parameter' });
const _ERR_INVALID_PROTOCOL = JSON.stringify({ error: 'Invalid protocol' });
const _ERR_INVALID_URL = JSON.stringify({ error: 'Invalid URL' });
const _ERR_PRIVATE_IP = JSON.stringify({ error: 'Redirect to private IP not allowed' });
const _ERR_TIMEOUT = JSON.stringify({ error: 'Stream timed out' });
const _ERR_BLACKLISTED = JSON.stringify({ error: 'Station temporarily unavailable', blacklisted: true });
const _NOOP = () => {};
const _EVT_ONCE = { once: true } as const;
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.proxyStream);
  if (limited) return limited;

  const streamUrl = req.nextUrl.searchParams.get('url');
  if (!streamUrl || streamUrl.length > 2048) {
    return new Response(_ERR_MISSING_URL, {
      status: 400,
      headers: _JSON_HDRS,
    });
  }
  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return new Response(_ERR_INVALID_PROTOCOL, {
        status: 400,
        headers: _JSON_HDRS,
      });
    }
  } catch {
    return new Response(_ERR_INVALID_URL, {
      status: 400,
      headers: _JSON_HDRS,
    });
  }
  // Blacklist check: reject immediately if station has repeated failures
  if (isStationBlacklisted(streamUrl)) {
    return new Response(_ERR_BLACKLISTED, {
      status: 503,
      headers: _JSON_BL_HDRS,
    });
  }
  const controller = new AbortController();
  const timeout =
    MAX_DURATION_MS > 0 ? setTimeout(() => controller.abort(), MAX_DURATION_MS) : null;
  if (req.signal) {
    if (req.signal.aborted) controller.abort();
    else req.signal.addEventListener('abort', () => controller.abort(), _EVT_ONCE);
  }
  try {
    const upstream = await fetch(parsed.href, {
      headers: _UPSTREAM_HDRS,
      signal: controller.signal,
    });
    if (upstream.url) {
      try {
        const finalUrl = new URL(upstream.url);
        if (isPrivateHost(finalUrl.hostname)) {
          if (timeout) clearTimeout(timeout);
          upstream.body?.cancel().catch(_NOOP);
          return new Response(_ERR_PRIVATE_IP, {
            status: 403,
            headers: _JSON_HDRS,
          });
        }
      } catch {}
    }
    if (!upstream.ok || !upstream.body) {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      recordStationFailure(streamUrl);
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: _JSON_R3_HDRS,
      });
    }
    // Successful connection — clear any previous failure count
    clearStationFailures(streamUrl);
    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const icyBr = upstream.headers.get('icy-br');
    const icyName = upstream.headers.get('icy-name');
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store',
      'Transfer-Encoding': 'chunked',
    };
    if (icyBr) responseHeaders['X-Stream-Bitrate'] = icyBr;
    if (icyName) responseHeaders['X-Stream-Name'] = icyName;
    if (req.method === 'HEAD') {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      return new Response(null, { status: 200, headers: responseHeaders });
    }
    return new Response(upstream.body, { status: 200, headers: responseHeaders });
  } catch (err) {
    if (timeout) clearTimeout(timeout);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    if (isTimeout) {
      recordStationFailure(streamUrl);
      return new Response(_ERR_TIMEOUT, {
        status: 504,
        headers: _JSON_HDRS,
      });
    }
    recordStationFailure(streamUrl);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: _JSON_R5_HDRS,
    });
  }
}
