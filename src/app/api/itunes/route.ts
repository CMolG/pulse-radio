/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Server-side proxy for iTunes Search API.
 * Avoids any browser-side CORS/CSP issues and allows server caching.
 */
export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get('term');
  if (!term) {
    return NextResponse.json({ error: 'Missing term parameter', results: [] }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const url = `https://itunes.apple.com/search?${new URLSearchParams({
      term,
      media: 'music',
      entity: 'song',
      limit: '3',
    })}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'iTunes API error', results: [] }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    clearTimeout(timeout);
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Internal error', results: [] },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
