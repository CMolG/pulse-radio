/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, apiCatchResponse } from '@/lib/apiUtils';

export const runtime = 'nodejs';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';

type ITunesPodcast = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600: string;
  feedUrl: string;
  genres: string[];
  releaseDate: string;
  trackCount: number;
  collectionViewUrl: string;
};

/**
 * Search podcasts via iTunes Search API (free, no API key).
 * GET /api/podcast-search?q=<query>&limit=20&genre=<genre>
 *
 * The iTunes Search API is completely free, requires no authentication,
 * and has generous rate limits. It indexes virtually all podcasts
 * available on Apple Podcasts.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid q parameter' }, { status: 400 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20, 50);
  const genre = req.nextUrl.searchParams.get('genre') || '';

  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    limit: String(limit),
    entity: 'podcast',
  });
  if (genre) params.set('genreId', genre);

  try {
    const res = await apiFetch(`${ITUNES_SEARCH}?${params}`, { timeoutMs: 8_000, maxBytes: 2 * 1024 * 1024, label: 'iTunes' });

    const data = await res.json();
    const podcasts: ITunesPodcast[] = data.results || [];

    const results = podcasts
      .filter((p) => p.feedUrl)
      .map((p) => ({
        id: p.collectionId,
        name: p.collectionName,
        author: p.artistName,
        artwork: p.artworkUrl600 || '',
        feedUrl: p.feedUrl,
        genres: p.genres || [],
        lastRelease: p.releaseDate || null,
        episodeCount: p.trackCount || 0,
        itunesUrl: p.collectionViewUrl || null,
      }));

    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' } },
    );
  } catch (err) {
    return apiCatchResponse(err);
  }
}
