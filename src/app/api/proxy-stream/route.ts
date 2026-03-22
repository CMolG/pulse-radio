/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

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
    // Block self-referential/localhost URLs to prevent infinite proxy loops
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.localhost')
    ) {
      return new Response(JSON.stringify({ error: 'Loopback URLs not allowed' }), {
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
  const timeout = setTimeout(() => controller.abort(), MAX_DURATION_MS);

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'JavadabaRadio/1.0',
        'Icy-MetaData': '0',
      },
      signal: controller.signal,
    });

    if (!upstream.ok || !upstream.body) {
      clearTimeout(timeout);
      upstream.body?.cancel().catch(() => {}); // release connection
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType =
      upstream.headers.get('content-type') || 'audio/mpeg';

    // Reject non-audio responses (e.g. HTML redirect pages, JSON errors)
    if (
      !contentType.startsWith('audio/') &&
      !contentType.startsWith('application/ogg') &&
      contentType !== 'application/octet-stream'
    ) {
      clearTimeout(timeout);
      upstream.body.cancel().catch(() => {});
      return new Response(JSON.stringify({ error: 'Upstream returned non-audio content' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Wrap the upstream body so we can clear the timeout when the stream
    // ends naturally (client disconnect or upstream close) instead of
    // leaving a 60-minute timer running per connection.
    const { readable, writable } = new TransformStream();
    upstream.body.pipeTo(writable).catch(() => {}).finally(() => clearTimeout(timeout));

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    clearTimeout(timeout);
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
