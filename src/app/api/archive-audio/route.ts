/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, apiCatchResponse, stripHtml } from '@/lib/apiUtils';

export const runtime = 'nodejs';

const ARCHIVE_API = 'https://archive.org/advancedsearch.php';

type ArchiveDoc = {
  identifier: string;
  title: string;
  description?: string;
  creator?: string;
  date?: string;
  subject?: string | string[];
  mediatype?: string;
  downloads?: number;
  avg_rating?: number;
  num_reviews?: number;
  collection?: string[];
};

/**
 * Search Internet Archive audio collections.
 * GET /api/archive-audio?q=<search>&collection=<collection>&limit=20
 *
 * Collections: etree (live music), oldtimeradio, audio_podcast,
 * opensource_audio, librivoxaudio, audio_music, audio_religion, etc.
 *
 * All content is public domain or Creative Commons licensed — legal and free.
 * No API key required.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid q parameter' }, { status: 400 });
  }

  const collection = req.nextUrl.searchParams.get('collection') || '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20', 10) || 20, 50);

  // Build search query: filter by audio mediatype and optional collection
  let searchQuery = `(${query}) AND mediatype:audio`;
  if (collection) {
    searchQuery += ` AND collection:${collection}`;
  }

  const params = new URLSearchParams({
    q: searchQuery,
    fl: 'identifier,title,description,creator,date,subject,mediatype,downloads,avg_rating,num_reviews,collection',
    sort: 'downloads desc',
    rows: String(limit),
    page: '1',
    output: 'json',
  });

  try {
    const url = `${ARCHIVE_API}?${params}`;
    const res = await apiFetch(url, { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, label: 'Archive.org' });

    const data = await res.json();
    const docs: ArchiveDoc[] = data.response?.docs || [];

    const results = docs.map((d) => ({
      id: d.identifier,
      title: d.title || d.identifier,
      description: stripHtml(d.description || '').slice(0, 300),
      creator: d.creator || 'Unknown',
      date: d.date || null,
      tags: Array.isArray(d.subject) ? d.subject.slice(0, 5) : d.subject ? [d.subject] : [],
      detailUrl: `https://archive.org/details/${d.identifier}`,
      embedUrl: `https://archive.org/embed/${d.identifier}`,
      downloads: d.downloads || 0,
      rating: d.avg_rating || null,
      collections: d.collection || [],
    }));

    return NextResponse.json({
      results,
      total: data.response?.numFound || 0,
      availableCollections: [
        { id: 'etree', label: 'Live Music Archive' },
        { id: 'oldtimeradio', label: 'Old Time Radio' },
        { id: 'audio_podcast', label: 'Podcasts' },
        { id: 'opensource_audio', label: 'Community Audio' },
        { id: 'librivoxaudio', label: 'LibriVox Audiobooks' },
        { id: 'audio_music', label: 'Music' },
      ],
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
    });
  } catch (err) {
    return apiCatchResponse(err);
  }
}
