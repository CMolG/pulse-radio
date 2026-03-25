/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/apiUtils';

export const runtime = 'nodejs';

/**
 * Server-side proxy for iTunes Search API.
 * Avoids any browser-side CORS/CSP issues and allows server caching.
 */
export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get('term');
  if (!term || term.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid term parameter', results: [] }, { status: 400 });
  }

  // Support podcast search via ?media=podcast (defaults to music for backward compat)
  const media = req.nextUrl.searchParams.get('media') === 'podcast' ? 'podcast' : 'music';
  const entity = media === 'podcast' ? 'podcast' : 'song';
  const limit = media === 'podcast' ? '20' : '3';

  try {
    const url = `https://itunes.apple.com/search?${new URLSearchParams({ term, media, entity, limit, })}`;

    const res = await apiFetch(url, { timeoutMs: 8_000, maxBytes: 2 * 1024 * 1024, label: 'iTunes API' });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : (e instanceof Error ? e.message : 'Internal error'), results: [] },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
