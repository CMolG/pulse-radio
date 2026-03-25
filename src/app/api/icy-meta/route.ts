/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isPrivateHost } from '@/lib/urlSecurity';

export const runtime = 'nodejs';

/**
 * Server-side ICY metadata proxy.
 * Fetches the first metadata block from an internet radio stream
 * using the ICY protocol, which browsers can't do directly due to CORS.
 */
export async function GET(req: NextRequest) {
  const streamUrl = req.nextUrl.searchParams.get('url');
  if (!streamUrl || streamUrl.length > 2048) {
    return NextResponse.json({ error: 'Missing or invalid url parameter' }, { status: 400 });
  }

  try {
    const url = new URL(streamUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }
    const host = url.hostname.toLowerCase();
    if (isPrivateHost(host)) return NextResponse.json({ error: 'Private/internal URLs not allowed' }, { status: 400 });
  } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }); }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(streamUrl, { headers: { 'Icy-MetaData': '1' }, signal: controller.signal, });

    // Validate the final URL after redirects to prevent SSRF via redirect
    if (res.url) {
      try {
        const finalUrl = new URL(res.url);
        if (isPrivateHost(finalUrl.hostname.toLowerCase())) {
          clearTimeout(timeout);
          res.body?.cancel().catch(() => {});
          return NextResponse.json({ error: 'Redirect to private IP not allowed' }, { status: 403 });
        }
      } catch { /* URL parse failed — continue */ }
    }

    if (!res.ok) {
      clearTimeout(timeout);
      res.body?.cancel().catch(() => {});
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const icyMetaint = res.headers.get('icy-metaint');
    const icyName = res.headers.get('icy-name');
    const icyGenre = res.headers.get('icy-genre');
    const icyBr = res.headers.get('icy-br');

    if (!icyMetaint || !res.body) {
      // No ICY support — return whatever headers are available
      clearTimeout(timeout);
      res.body?.cancel().catch(() => {});
      return NextResponse.json({
        streamTitle: null,
        icyName: icyName || null,
        icyGenre: icyGenre || null,
        icyBr: icyBr || null,
      });
    }

    const metaint = parseInt(icyMetaint, 10);
    // Most streams use 8192 or 16384; cap at 128KB to prevent OOM on adversarial input
    const MAX_METAINT = 131072;
    if (isNaN(metaint) || metaint <= 0 || metaint > MAX_METAINT) {
      clearTimeout(timeout);
      res.body.cancel().catch(() => {});
      return NextResponse.json({ streamTitle: null, icyName, icyGenre, icyBr });
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
      reader.cancel().catch(() => {});
    }

    // Concatenate chunks
    const buffer = new Uint8Array(totalRead);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }

    // ICY metadata starts at position metaint
    if (buffer.length <= metaint) return NextResponse.json({ streamTitle: null, icyName, icyGenre, icyBr });

    const metaLength = buffer[metaint] * 16;
    if (metaLength === 0 || buffer.length < metaint + 1 + metaLength) {
      return NextResponse.json({ streamTitle: null, icyName, icyGenre, icyBr });
    }

    const metaBytes = buffer.slice(metaint + 1, metaint + 1 + metaLength);
    const metaString = new TextDecoder('utf-8').decode(metaBytes).replace(/\0+$/, '');

    // Parse StreamTitle='Artist - Title';
    const match = metaString.match(/StreamTitle='([^']*)'/);
    const streamTitle = match?.[1]?.trim() || null;

    return NextResponse.json({ streamTitle, icyName, icyGenre, icyBr });
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    if (isTimeout) return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
