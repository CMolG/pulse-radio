/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import { NextRequest } from 'next/server';
import { isStationBlacklisted, recordStationFailure, clearStationFailures } from '@/logic/server-cache';
import { sanitizeUrl, sanitizeHeaderValue, sanitizeForLog } from '@/logic/sanitize';
import { validateRequest } from '@/logic/validate-request';
import { proxyStreamSchema } from '@/logic/validation-schemas';
import { isPrivateHost, ALLOWED_PROTOCOLS } from '@/logic/ssrf';
import { apiError } from '@/logic/api-response';
export const runtime = 'nodejs';
const MAX_DURATION_MS = 0;
const _UPSTREAM_HDRS = { 'User-Agent': 'JavadabaRadio/1.0', 'Icy-MetaData': '0' } as const;
const _NOOP = () => {};
const _EVT_ONCE = { once: true } as const;

export async function GET(req: NextRequest) {
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
    if (isPrivateHost(parsed.hostname)) {
      return apiError('Private/internal URLs not allowed', 'INVALID_PARAM', 400);
    }
  } catch {
    return apiError('Invalid URL', 'INVALID_PARAM', 400);
  }
  if (isStationBlacklisted(streamUrl)) {
    return apiError('Station temporarily unavailable', 'BLACKLISTED', 503, { 'X-Station-Blacklisted': 'true' });
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
          return apiError('Redirect to private IP not allowed', 'INVALID_PARAM', 403);
        }
      } catch {}
    }
    if (!upstream.ok || !upstream.body) {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      recordStationFailure(streamUrl);
      return apiError(`Upstream ${upstream.status}`, 'UPSTREAM_ERROR', 502, { 'Retry-After': '3' });
    }
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
    if (icyBr) responseHeaders['X-Stream-Bitrate'] = sanitizeHeaderValue(icyBr);
    if (icyName) responseHeaders['X-Stream-Name'] = sanitizeHeaderValue(icyName);
    if (req.method === 'HEAD') {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(_NOOP);
      return new Response(null, { status: 200, headers: responseHeaders });
    }
    // Direct passthrough — matches main branch behavior
    return new Response(upstream.body, { status: 200, headers: responseHeaders });
  } catch (err) {
    if (timeout) clearTimeout(timeout);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    if (isAbort) {
      recordStationFailure(streamUrl);
      return apiError('Stream timed out', 'TIMEOUT', 504);
    }
    recordStationFailure(streamUrl);
    console.error('[proxy-stream] Connection failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
    return apiError('Stream connection failed', 'UPSTREAM_ERROR', 502, { 'Retry-After': '5' });
  }
}
