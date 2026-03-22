import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const MAX_DURATION_MS = 60 * 60 * 1000; // 60 min max per proxy connection

/**
 * Proxies an internet radio stream, adding CORS headers so the browser
 * can use it with <audio crossOrigin="anonymous"> + Web Audio API.
 */
export async function GET(req: NextRequest) {
  const streamUrl = req.nextUrl.searchParams.get('url');
  if (!streamUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
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
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_DURATION_MS);

    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'JavadabaRadio/1.0',
        'Icy-MetaData': '0',
      },
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      clearTimeout(timeout);
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType =
      upstream.headers.get('content-type') || 'audio/mpeg';

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('abort')) {
      return new Response(JSON.stringify({ error: 'Stream timed out' }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
