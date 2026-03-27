/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { getScores } from '@/lib/station-health';
import { rateLimit } from '@/lib/rate-limiter';
import { withApiVersion } from '@/lib/api-versioning';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  // Support both ?urls= (URL-based) and ?uuids= (UUID-based) lookups
  const urlsParam = req.nextUrl.searchParams.get('urls') ?? '';
  const urls = urlsParam
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (urls.length === 0) {
    return withApiVersion(NextResponse.json({ error: 'Missing urls parameter' }, { status: 400 }));
  }

  const scores = getScores(urls);

  // Add health tier labels
  const enriched: Record<string, { score: number; tier: string }> = {};
  for (const [url, score] of Object.entries(scores)) {
    enriched[url] = {
      score,
      tier: score >= 0.8 ? 'reliable' : score >= 0.5 ? 'intermittent' : 'unreliable',
    };
  }

  return withApiVersion(NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
  }));
}
