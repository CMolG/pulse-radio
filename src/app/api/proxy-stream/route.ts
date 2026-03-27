/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import { NextRequest } from 'next/server';
import { isStationBlacklisted, recordStationFailure, clearStationFailures } from '@/lib/server-cache';
import { recordSuccess, recordFailure, isUnhealthy } from '@/lib/station-health';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeUrl, sanitizeHeaderValue } from '@/lib/sanitize';
import { logRequest } from '@/lib/logger';
import { validateRequest } from '@/lib/validate-request';
import { proxyStreamSchema } from '@/lib/validation-schemas';
import { isPrivateHost, ALLOWED_PROTOCOLS, resolveDnsAndValidate } from '@/lib/ssrf';
import { safeErrorResponse } from '@/lib/api-error-sanitizer';
export const runtime = 'nodejs';
const MAX_DURATION_MS = 25_000;
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

// --- Stream connection limits & backpressure (ARCH-042) ---
const MAX_STREAMS_PER_IP = 5;
const MAX_STREAMS_TOTAL = 200;
const BACKPRESSURE_LIMIT = 256 * 1024; // 256KB (4 × 64KB chunks)
const _ERR_LIMIT_IP = JSON.stringify({ error: 'Too many concurrent streams from this IP' });
const _ERR_LIMIT_TOTAL = JSON.stringify({ error: 'Server stream capacity reached' });
const _JSON_R10_HDRS = { 'Content-Type': 'application/json', 'Retry-After': '10' } as const;

const ipStreamCounts = new Map<string, number>();
let totalActiveStreams = 0;
let peakStreams = 0;
let totalServed = 0;
let backpressureAborts = 0;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? '127.0.0.1';
}

function incrementStreamCount(ip: string): void {
  ipStreamCounts.set(ip, (ipStreamCounts.get(ip) ?? 0) + 1);
  totalActiveStreams++;
  totalServed++;
  if (totalActiveStreams > peakStreams) peakStreams = totalActiveStreams;
}

function decrementStreamCount(ip: string): void {
  const current = ipStreamCounts.get(ip) ?? 0;
  if (current <= 1) ipStreamCounts.delete(ip);
  else ipStreamCounts.set(ip, current - 1);
  totalActiveStreams = Math.max(0, totalActiveStreams - 1);
}

export function getStreamMetrics() {
  return { activeStreams: totalActiveStreams, peakStreams, totalServed, backpressureAborts };
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.proxyStream);
  if (limited) return limited;
  logRequest(req);

  const clientIp = getClientIp(req);
  if ((ipStreamCounts.get(clientIp) ?? 0) >= MAX_STREAMS_PER_IP) {
    return new Response(_ERR_LIMIT_IP, { status: 503, headers: _JSON_R10_HDRS });
  }
  if (totalActiveStreams >= MAX_STREAMS_TOTAL) {
    return new Response(_ERR_LIMIT_TOTAL, { status: 503, headers: _JSON_R10_HDRS });
  }

  const validated = validateRequest(proxyStreamSchema, req.nextUrl.searchParams);
  if (!validated.success) return new Response(_ERR_MISSING_URL, { status: 400, headers: _JSON_HDRS });
  const streamUrl = sanitizeUrl(validated.data.url);
  if (!streamUrl) return new Response(_ERR_MISSING_URL, { status: 400, headers: _JSON_HDRS });
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
  if (isStationBlacklisted(streamUrl) || isUnhealthy(streamUrl)) {
    return new Response(_ERR_BLACKLISTED, {
      status: 503,
      headers: _JSON_BL_HDRS,
    });
  }
  incrementStreamCount(clientIp);
  const controller = new AbortController();
  const connectStart = Date.now();
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
          decrementStreamCount(clientIp);
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
      recordFailure(streamUrl);
      decrementStreamCount(clientIp);
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: _JSON_R3_HDRS,
      });
    }
    // Successful connection — clear any previous failure count
    clearStationFailures(streamUrl);
    recordSuccess(streamUrl, Date.now() - connectStart);
    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const icyBr = upstream.headers.get('icy-br');
    const icyName = upstream.headers.get('icy-name');
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store',
      'Transfer-Encoding': 'chunked',
    };
    if (icyBr) responseHeaders['X-Stream-Bitrate'] = sanitizeHeaderValue(icyBr);
    if (icyName) responseHeaders['X-Stream-Name'] = sanitizeHeaderValue(icyName);
    if (req.method === 'HEAD') {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      decrementStreamCount(clientIp);
      return new Response(null, { status: 200, headers: responseHeaders });
    }
    // Backpressure-aware intermediary stream (ARCH-042)
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>(
      {
        transform(chunk, ctrl) {
          ctrl.enqueue(chunk);
          if (ctrl.desiredSize !== null && ctrl.desiredSize < 0) {
            backpressureAborts++;
            console.warn('[proxy-stream] Backpressure limit exceeded, aborting slow client');
            ctrl.error(new Error('Backpressure limit exceeded'));
          }
        },
      },
      undefined,
      { highWaterMark: BACKPRESSURE_LIMIT, size: (chunk) => chunk.byteLength },
    );
    upstream.body.pipeTo(writable).catch(_NOOP).finally(() => {
      decrementStreamCount(clientIp);
      if (timeout) clearTimeout(timeout);
    });
    return new Response(readable, { status: 200, headers: responseHeaders });
  } catch (err) {
    if (timeout) clearTimeout(timeout);
    decrementStreamCount(clientIp);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    if (isTimeout) {
      recordStationFailure(streamUrl);
      recordFailure(streamUrl);
      return new Response(_ERR_TIMEOUT, {
        status: 504,
        headers: _JSON_HDRS,
      });
    }
    recordStationFailure(streamUrl);
    recordFailure(streamUrl);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: _JSON_R5_HDRS,
    });
  }
}
