/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server'; export const runtime = 'nodejs';
const MB_BASE = 'https://musicbrainz.org/ws/2'; const WIKI_BASE = 'https://en.wikipedia.org/api/rest_v1';
const USER_AGENT = 'PulseRadio/1.0 (https://pulse-radio.online)'; const MUSIC_KEYWORDS =
  /band|singer|musician|artist|rapper|group|duo|dj|producer|composer|vocalist|songwriter|hip.hop|rock|pop|jazz|classical|electronic|country|metal|r&b|soul|blues|funk|reggae|punk|folk/i;
async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> { try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) { await res.text().catch(() => {}); return null; } const cl = res.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 2 * 1024 * 1024) { await res.body?.cancel().catch(() => {}); return null; } return await res.json();
  } catch { return null; } }
async function searchMusicBrainz(artist: string) {
  const url = `${MB_BASE}/artist/?query=artist:${encodeURIComponent(artist)}&fmt=json&limit=1`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await fetchJson<{ artists?: any[] }>(url, { 'User-Agent': USER_AGENT, Accept: 'application/json' });
  return data?.artists?.[0] ?? null; }
async function fetchWikiSummary(title: string) { const url = `${WIKI_BASE}/page/summary/${encodeURIComponent(title)}`;
  const data = await fetchJson<any>(url, { 'User-Agent': USER_AGENT }); // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (data?.type === 'disambiguation') return null; return data; }
export async function GET(req: NextRequest) { const artist = req.nextUrl.searchParams.get('artist'); if (!artist || artist.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid artist parameter' }, { status: 400 }); }
  try { const [mbResult, wikiResult] = await Promise.allSettled([ searchMusicBrainz(artist), fetchWikiSummary(artist),
    ]); const mb = mbResult.status === 'fulfilled' ? mbResult.value : null;
    let wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
    // If Wikipedia didn't find the artist or result isn't music-related, try common disambiguations
    if (!wiki || (wiki.description && !MUSIC_KEYWORDS.test(wiki.description))) { const suffixes = mb?.type === 'Person'
          ? ['(singer)', '(musician)', '(rapper)'] : ['(band)', '(musical group)', '(singer)', '(musician)'];
      for (const suffix of suffixes) { const attempt = await fetchWikiSummary(`${artist} ${suffix}`);
        if (attempt?.extract) { wiki = attempt; break; } }
    }
    const tags = mb?.tags ?.filter((t: { count: number }) => t.count > 0)
        ?.sort((a: { count: number }, b: { count: number }) => b.count - a.count)?.slice(0, 8) ?.map((t: { name: string }) => t.name) ?? [];
    const hasData = !!(mb || wiki?.extract); const cacheHeader = hasData ? 'public, max-age=86400, stale-while-revalidate=604800'
      : 'public, max-age=3600, stale-while-revalidate=7200';
    return NextResponse.json( { name: mb?.name ?? artist, disambiguation: mb?.disambiguation ?? null,
        type: mb?.type ?? null, country: mb?.country ?? null,
        beginArea: mb?.['begin-area']?.name ?? null, lifeSpan: mb?.['life-span'] ?? null, tags, bio: wiki?.extract ?? null,
        imageUrl: wiki?.thumbnail?.source ?? null, wikipediaUrl: wiki?.content_urls?.desktop?.page ?? null,
      }, { headers: { 'Cache-Control': cacheHeader, }, },);
  } catch (err) { console.error('[Pulse Radio] Artist info fetch error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 }); }
}
