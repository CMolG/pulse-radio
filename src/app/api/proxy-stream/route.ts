/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest } from 'next/server';
import { isPrivateHost } from '@/lib/urlSecurity';

export const runtime = 'nodejs';
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const MAX_DURATION_MS = 0; // 0 = no forced timeout; stream should run indefinitely

/**
 * Proxies an internet radio stream, adding CORS headers so the browser
 * can use it with <audio crossOrigin="anonymous"> + Web Audio API.
 */
export async function GET(req: NextRequest) {
  const streamUrl = req.nextUrl.searchParams.get('url');
  if (!streamUrl || streamUrl.length > 2048) {
    return new Response(JSON.stringify({ error: 'Missing or invalid url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: 'Invalid protocol' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Block loopback and private/internal IPs to prevent SSRF
    const host = parsed.hostname.toLowerCase();
    if (isPrivateHost(host)) {
      return new Response(JSON.stringify({ error: 'Private/internal URLs not allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const controller = new AbortController();
  const timeout = MAX_DURATION_MS > 0 ? setTimeout(() => controller.abort(), MAX_DURATION_MS) : null;

  // Propagate client disconnect to upstream so we don't leak connections
  if (req.signal) {
    if (req.signal.aborted) controller.abort();
    else req.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'JavadabaRadio/1.0', 'Icy-MetaData': '0', },
      signal: controller.signal,
    });
    // Validate the final URL after redirects to prevent SSRF via redirect
    if (upstream.url) {
      try {
        const finalUrl = new URL(upstream.url);
        if (isPrivateHost(finalUrl.hostname.toLowerCase())) {
          if (timeout) clearTimeout(timeout); upstream.body?.cancel().catch(() => {});
          return new Response(JSON.stringify({ error: 'Redirect to private IP not allowed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // URL parse failed — continue with original validation
      }
    }
    if (!upstream.ok || !upstream.body) {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(() => {}); // release connection
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '3' },
      });
    }
    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const icyBr = upstream.headers.get('icy-br'); const icyName = upstream.headers.get('icy-name');
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store',
      'Transfer-Encoding': 'chunked',
    };
    if (icyBr) responseHeaders['X-Stream-Bitrate'] = icyBr;
    if (icyName) responseHeaders['X-Stream-Name'] = icyName;
    // HEAD requests: return headers only (for prefetch / codec sniffing)
    if (req.method === 'HEAD') {
      if (timeout) clearTimeout(timeout); upstream.body?.cancel().catch(() => {});
      return new Response(null, { status: 200, headers: responseHeaders });
    }
    return new Response(upstream.body, { status: 200, headers: responseHeaders, });
  } catch (err) {
    if (timeout) clearTimeout(timeout);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    if (isTimeout) {
      return new Response(JSON.stringify({ error: 'Stream timed out' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '5' },
    });
  }
}
