/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OL_SEARCH = 'https://openlibrary.org/search.json';
const OL_COVERS = 'https://covers.openlibrary.org/b/olid';
const TIMEOUT_MS = 8_000;

type OLDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_edition_key?: string;
  subject?: string[];
  number_of_pages_median?: number;
  language?: string[];
  edition_count?: number;
  has_fulltext?: boolean;
};

/**
 * Search Open Library for book metadata to enrich audiobook results.
 * GET /api/open-library?q=<query>&limit=10
 *
 * Open Library (openlibrary.org) is a free, open-source project by
 * the Internet Archive. No API key required. Provides book covers,
 * descriptions, and metadata.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid q parameter' }, { status: 400 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10', 10), 30);

  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      fields: 'key,title,author_name,first_publish_year,cover_edition_key,subject,number_of_pages_median,language,edition_count,has_fulltext',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OL_SEARCH}?${params}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'PulseRadio/1.0 (audiobook-enrichment)' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      await res.text().catch(() => {});
      return NextResponse.json({ error: `Open Library returned ${res.status}` }, { status: 502 });
    }

    const MAX_JSON_BYTES = 2 * 1024 * 1024;
    const cl = res.headers.get('content-length');
    if (cl && parseInt(cl, 10) > MAX_JSON_BYTES) {
      await res.body?.cancel().catch(() => {});
      return NextResponse.json({ error: 'Response too large' }, { status: 502 });
    }

    const data = await res.json();
    const docs: OLDoc[] = data.docs || [];

    const results = docs.map((d) => ({
      key: d.key,
      title: d.title,
      authors: d.author_name || [],
      year: d.first_publish_year || null,
      coverUrl: d.cover_edition_key
        ? `${OL_COVERS}/${d.cover_edition_key}-M.jpg`
        : null,
      subjects: (d.subject || []).slice(0, 5),
      pages: d.number_of_pages_median || null,
      languages: (d.language || []).slice(0, 3),
      editions: d.edition_count || 0,
      hasFulltext: d.has_fulltext || false,
      detailUrl: `https://openlibrary.org${d.key}`,
    }));

    return NextResponse.json(
      { results, total: data.numFound || 0 },
      { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('abort')) {
      return NextResponse.json({ error: 'Open Library request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
