/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const LIBRIVOX_API = 'https://librivox.org/api/feed/audiobooks';
const TIMEOUT_MS = 10_000;

type LibriVoxBook = {
  id: string;
  title: string;
  description: string;
  url_librivox: string;
  url_rss: string;
  totaltime: string;
  num_sections: string;
  authors: { first_name: string; last_name: string }[];
};

/**
 * Search LibriVox public-domain audiobooks.
 * GET /api/librivox?q=<search>&limit=20
 *
 * LibriVox is a free, volunteer-driven project that records
 * public-domain books as audiobooks. All content is legal and free.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid q parameter' }, { status: 400 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10), 50);

  try {
    const url = `${LIBRIVOX_API}?title=${encodeURIComponent(query)}&format=json&limit=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      await res.text().catch(() => {});
      return NextResponse.json({ error: `LibriVox API returned ${res.status}` }, { status: 502 });
    }

    const cl = res.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 2 * 1024 * 1024) {
      await res.body?.cancel().catch(() => {});
      return NextResponse.json({ error: 'Response too large' }, { status: 502 });
    }

    const data = await res.json();
    const books: LibriVoxBook[] = data.books || [];

    const results = books.map((b) => ({
      id: b.id,
      title: b.title,
      description: stripHtml(b.description || '').slice(0, 300),
      author: b.authors?.map(a => `${a.first_name} ${a.last_name}`.trim()).join(', ') || 'Unknown',
      url: b.url_librivox,
      rssUrl: b.url_rss,
      totalTime: b.totaltime,
      chapters: parseInt(b.num_sections, 10) || 0,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'LibriVox request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
