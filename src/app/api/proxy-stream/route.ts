/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import { NextRequest } from 'next/server';
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
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 0) return true;
  }
  const ipv6 = host.replace(/^\[/, '').replace(/\]$/, '');
  if (ipv6.startsWith('fe80:')) return true;
  if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
  if (ipv6 === '::1' || ipv6 === '::') return true;
  const mappedMatch = ipv6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mappedMatch) return isPrivateHost(mappedMatch[1]);
  return false;
}
export const runtime = 'nodejs';
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_DURATION_MS = 0;
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
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return new Response(JSON.stringify({ error: 'Invalid protocol' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const host = parsed.hostname.toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const controller = new AbortController();
  const timeout =
    MAX_DURATION_MS > 0 ? setTimeout(() => controller.abort(), MAX_DURATION_MS) : null;
  if (req.signal) {
    if (req.signal.aborted) controller.abort();
    else req.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'JavadabaRadio/1.0', 'Icy-MetaData': '0' },
      signal: controller.signal,
    });
    if (upstream.url) {
      try {
        const finalUrl = new URL(upstream.url);
        if (isPrivateHost(finalUrl.hostname.toLowerCase())) {
          if (timeout) clearTimeout(timeout);
          upstream.body?.cancel().catch(() => {});
          return new Response(JSON.stringify({ error: 'Redirect to private IP not allowed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {}
    }
    if (!upstream.ok || !upstream.body) {
      if (timeout) clearTimeout(timeout);
      upstream.body?.cancel().catch(() => {});
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '3' },
      });
    }
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
      upstream.body?.cancel().catch(() => {});
      return new Response(null, { status: 200, headers: responseHeaders });
    }
    return new Response(upstream.body, { status: 200, headers: responseHeaders });
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
