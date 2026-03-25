/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ async function apiFetch(
  url: string,
  opts: { timeoutMs: number; maxBytes?: number; init?: RequestInit; label?: string },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, { ...opts.init, signal: controller.signal });
    if (!res.ok) {
      await res.text().catch(() => {});
      throw new Error(`${opts.label ?? 'Upstream'} returned ${res.status}`);
    }
    if (opts.maxBytes) {
      const cl = res.headers.get('content-length');
      if (cl && parseInt(cl, 10) > opts.maxBytes) {
        await res.body?.cancel().catch(() => {});
        throw new Error('Response too large');
      }
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
const _ERR_400 = { error: 'Missing or invalid term parameter', results: [] };
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' };
/* Server-side proxy for iTunes Search API. Avoids any browser-side CORS/CSP issues and allows server caching. */ export async function GET(
  req: NextRequest,
) {
  const term = req.nextUrl.searchParams.get('term');
  if (!term || term.length > 200) {
    return NextResponse.json(_ERR_400, { status: 400 });
  }
  const isPodcast = req.nextUrl.searchParams.get('media') === 'podcast';
  const media = isPodcast ? 'podcast' : 'music';
  const entity = isPodcast ? 'podcast' : 'song';
  const limit = isPodcast ? '20' : '3';
  try {
    const url = `https://itunes.apple.com/search?${new URLSearchParams({ term, media, entity, limit })}`;
    const res = await apiFetch(url, {
      timeoutMs: 8_000,
      maxBytes: 2 * 1024 * 1024,
      label: 'iTunes API',
    });
    const data = await res.json();
    return NextResponse.json(data, { headers: _CACHE_HDRS });
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === 'AbortError';
    return NextResponse.json(
      {
        error: isTimeout ? 'Request timed out' : e instanceof Error ? e.message : 'Internal error',
        results: [],
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
