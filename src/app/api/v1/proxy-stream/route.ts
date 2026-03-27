/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import { NextRequest } from 'next/server';
import { isStationBlacklisted, recordStationFailure, clearStationFailures } from '@/lib/server-cache';
import { recordSuccess, recordFailure, isUnhealthy } from '@/lib/station-health';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeUrl, sanitizeHeaderValue, sanitizeForLog } from '@/lib/sanitize';
import { logRequest } from '@/lib/logger';
import { validateRequest } from '@/lib/validate-request';
import { proxyStreamSchema } from '@/lib/validation-schemas';
import { isPrivateHost, ALLOWED_PROTOCOLS, resolveDnsAndValidate } from '@/lib/ssrf';
import { apiError } from '@/lib/api-response';
export const runtime = 'nodejs';
const MAX_DURATION_MS = 25_000;
const _UPSTREAM_HDRS = { 'User-Agent': 'JavadabaRadio/1.0', 'Icy-MetaData': '0' } as const;
const _NOOP = () => {};
const _EVT_ONCE = { once: true } as const;

// --- Stream connection limits & backpressure (ARCH-042) ---
const MAX_STREAMS_PER_IP = 5;
const MAX_STREAMS_TOTAL = 200;
const BACKPRESSURE_LIMIT = 256 * 1024; // 256KB (4 × 64KB chunks)


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
    return apiError('Too many concurrent streams from this IP', 'RATE_LIMITED', 503, { 'Retry-After': '10' });
  }
  if (totalActiveStreams >= MAX_STREAMS_TOTAL) {
    return apiError('Server stream capacity reached', 'RATE_LIMITED', 503, { 'Retry-After': '10' });
  }

  const validated = validateRequest(proxyStreamSchema, req.nextUrl.searchParams);
  if (!validated.success) return apiError('Missing or invalid url parameter', 'INVALID_PARAM', 400);
  const streamUrl = sanitizeUrl(validated.data.url);
  if (!streamUrl) return apiError('Missing or invalid url parameter', 'INVALID_PARAM', 400);
  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return apiError('Invalid protocol', 'INVALID_PARAM', 400);
    }
    try {
      await resolveDnsAndValidate(parsed.hostname);
    } catch {
      return apiError('Redirect to private IP not allowed', 'INVALID_PARAM', 400);
    }
  } catch {
    return apiError('Invalid URL', 'INVALID_PARAM', 400);
  }
  // Blacklist check: reject immediately if station has repeated failures
  if (isStationBlacklisted(streamUrl) || isUnhealthy(streamUrl)) {
    return apiError('Station temporarily unavailable', 'BLACKLISTED', 503, { 'X-Station-Blacklisted': 'true' });
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
          return apiError('Redirect to private IP not allowed', 'INVALID_PARAM', 403);
        }
      } catch {}
    } else {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      decrementStreamCount(clientIp);
      return apiError('Redirect target unknown', 'UPSTREAM_ERROR', 400);
    }
    if (!upstream.ok || !upstream.body) {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      recordStationFailure(streamUrl);
      recordFailure(streamUrl);
      decrementStreamCount(clientIp);
      return apiError(`Upstream ${upstream.status}`, 'UPSTREAM_ERROR', 502, { 'Retry-After': '3' });
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
      return apiError('Stream timed out', 'TIMEOUT', 504);
    }
    recordStationFailure(streamUrl);
    recordFailure(streamUrl);
    console.error('[proxy-stream] Connection failed:', err);
    return apiError('Stream connection failed', 'UPSTREAM_ERROR', 502, { 'Retry-After': '5' });
  }
}
