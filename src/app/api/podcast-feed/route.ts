/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { NextRequest, NextResponse } from 'next/server';
import { isPrivateHost } from '@/lib/urlSecurity';
import { apiFetch, apiCatchResponse, stripHtml } from '@/lib/apiUtils';

export const runtime = 'nodejs';

type PodcastEpisode = {
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string;
  duration: string;
  artworkUrl: string;
};

/**
 * Fetches and parses a podcast RSS feed to extract episodes.
 * Podcast RSS feeds are public by design — this is the standard
 * way podcast apps discover and play episodes.
 */
export async function GET(req: NextRequest) {
  const feedUrl = req.nextUrl.searchParams.get('url');
  if (!feedUrl || feedUrl.length > 2048) {
    return NextResponse.json({ error: 'Missing or invalid url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(feedUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }
    if (isPrivateHost(parsed.hostname.toLowerCase())) {
      return NextResponse.json({ error: 'Private/internal URLs not allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await apiFetch(parsed.toString(), {
      timeoutMs: 10_000,
      init: {
        headers: {
          'User-Agent': 'PulseRadio/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      },
      label: 'Upstream',
    });

    // Reject feeds larger than 5MB to prevent memory exhaustion from malicious sources
    const contentLength = res.headers.get('content-length');
    const MAX_FEED_BYTES = 5 * 1024 * 1024;
    if (contentLength && parseInt(contentLength, 10) > MAX_FEED_BYTES) {
      await res.body?.cancel().catch(() => {});
      return NextResponse.json({ error: 'Feed too large' }, { status: 413 });
    }

    const xml = await res.text();
    if (xml.length > MAX_FEED_BYTES) {
      return NextResponse.json({ error: 'Feed too large' }, { status: 413 });
    }
    const episodes = parseRssFeed(xml);

    return NextResponse.json({ episodes }, {
      headers: { 'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' },
    });
  } catch (e) {
    return apiCatchResponse(e, 500);
  }
}

/** Lightweight RSS XML parser using regex — no external dependencies */
function parseRssFeed(xml: string): PodcastEpisode[] {
  const episodes: PodcastEpisode[] = [];
  const channelArt = extractTag(xml, 'itunes:image', 'href') || extractNestedContent(xml, 'image', 'url') || '';

  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  let count = 0;
  const MAX_EPISODES = 50;

  while ((match = itemRegex.exec(xml)) !== null && count < MAX_EPISODES) {
    const item = match[1];
    const title = extractTagContent(item, 'title') || '';
    const description = stripHtml(extractTagContent(item, 'description') || extractTagContent(item, 'itunes:summary') || '');
    const audioUrl = extractTag(item, 'enclosure', 'url') || '';
    const pubDate = extractTagContent(item, 'pubDate') || '';
    const duration = extractTagContent(item, 'itunes:duration') || '';
    const artworkUrl = extractTag(item, 'itunes:image', 'href') || channelArt;

    if (audioUrl) {
      episodes.push({ title, description: description.slice(0, 500), audioUrl, pubDate, duration, artworkUrl });
      count++;
    }
  }

  return episodes;
}

function extractTagContent(xml: string, tag: string): string | null {
  // Handle CDATA and regular content
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${tag}>`, 'i');
  const m = regex.exec(xml);
  return m ? (m[1] || m[2] || '').trim() : null;
}

function extractTag(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*?${attr}=["']([^"']+)["']`, 'i');
  const m = regex.exec(xml);
  return m?.[1]?.trim() || null;
}

/** Extract content of a child tag nested inside a parent tag: <parent>...<child>value</child>...</parent> */
function extractNestedContent(xml: string, parent: string, child: string): string | null {
  const parentRegex = new RegExp(`<${parent}[\\s>][\\s\\S]*?<\\/${parent}>`, 'i');
  const m = parentRegex.exec(xml);
  if (!m) return null;
  return extractTagContent(m[0], child);
}
