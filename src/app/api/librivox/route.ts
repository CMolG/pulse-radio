/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, apiCatchResponse, stripHtml } from '@/lib/apiUtils';

export const runtime = 'nodejs';

const LIBRIVOX_API = 'https://librivox.org/api/feed/audiobooks';

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

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20, 50);

  try {
    const url = `${LIBRIVOX_API}?title=${encodeURIComponent(query)}&format=json&limit=${limit}`;
    const res = await apiFetch(url, { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, label: 'LibriVox API' });

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

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return apiCatchResponse(err);
  }
}
