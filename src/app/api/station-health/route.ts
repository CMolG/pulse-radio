/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { getScores } from '@/lib/station-health';
import { rateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const urlsParam = req.nextUrl.searchParams.get('urls') ?? '';
  const urls = urlsParam
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 50); // Limit to 50 URLs

  if (urls.length === 0) {
    return NextResponse.json({ error: 'Missing urls parameter' }, { status: 400 });
  }

  const scores = getScores(urls);
  return NextResponse.json(scores, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
