/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * Background sync endpoint for stale cache records.
 * Protected by CRON_SECRET env var — call from VPS cron:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://yourhost/api/cron/sync
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStaleKeys, persistToDb } from '@/lib/services/CacheRepository';
import { cacheSet, type Namespace } from '@/lib/server-cache';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { logRequest } from '@/lib/logger';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 300; // allow up to 5 minutes

/* ── Mutex gate: prevent concurrent / too-frequent sync runs ── */
let syncInProgress = false;
let lastSyncTimestamp = 0;
const MIN_SYNC_INTERVAL_MS = 60_000; // 1 minute minimum between syncs

const _NOOP = () => {};

const TIMEOUT_MS = 10_000;

async function safeFetch(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      await res.text().catch(_NOOP);
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

type SyncFn = (key: string) => Promise<{ data: unknown; ttlMs: number } | null>;

const syncers: Record<string, SyncFn> = {
  itunes: async (key) => {
    // key format: "media:term"
    const [media, ...termParts] = key.split(':');
    const term = termParts.join(':');
    if (!term) return null;
    const entity = media === 'podcast' ? 'podcast' : 'song';
    const limit = media === 'podcast' ? '20' : '3';
    const data = await safeFetch(
      `https://itunes.apple.com/search?${new URLSearchParams({ term, media: media || 'music', entity, limit })}`,
    );
    return data ? { data, ttlMs: 60 * 60 * 1000 } : null;
  },

  'artist-info': async (key) => {
    // Re-fetch via internal route would be circular; fetch externally
    const MB_BASE = 'https://musicbrainz.org/ws/2';
    const WIKI_BASE = 'https://en.wikipedia.org/api/rest_v1';
    const hdrs = { 'User-Agent': 'PulseRadio/1.0 (https://pulse-radio.online)' };

    interface ArtistInfo {
      name?: string;
      type?: string;
      country?: string;
      disambiguation?: string;
      'begin-area'?: { name?: string };
      'life-span'?: Record<string, unknown>;
      tags?: Array<{ count: number; name: string }>;
    }

    const mbData = (await safeFetch(
      `${MB_BASE}/artist/?query=artist:${encodeURIComponent(key)}&fmt=json&limit=1`,
    )) as { artists?: ArtistInfo[] } | null;
    const mb = mbData?.artists?.[0] ?? null;
    const wiki = (await safeFetch(`${WIKI_BASE}/page/summary/${encodeURIComponent(key)}`)) as {
      extract?: string;
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    } | null;

    const tags = (mb?.tags ?? [])
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((t) => t.name);
    const payload = {
      name: mb?.name ?? key,
      disambiguation: mb?.disambiguation ?? null,
      type: mb?.type ?? null,
      country: mb?.country ?? null,
      beginArea: mb?.['begin-area']?.name ?? null,
      lifeSpan: mb?.['life-span'] ?? null,
      tags,
      bio: wiki?.extract ?? null,
      imageUrl: wiki?.thumbnail?.source ?? null,
      wikipediaUrl: wiki?.content_urls?.desktop?.page ?? null,
    };
    return { data: payload, ttlMs: 24 * 60 * 60 * 1000 };
  },

  concerts: async (key) => {
    const raw = await safeFetch(
      `https://rest.bandsintown.com/artists/${encodeURIComponent(key)}/events?app_id=${env.BANDSINTOWN_APP_ID}&date=upcoming`,
    );
    if (!Array.isArray(raw)) return { data: [], ttlMs: 12 * 60 * 60 * 1000 };
    const events = raw.slice(0, 5).map((e: Record<string, unknown>) => ({
      id: e.id,
      date: e.datetime,
      venue: (e.venue as Record<string, unknown>)?.name,
      city: (e.venue as Record<string, unknown>)?.city,
      country: (e.venue as Record<string, unknown>)?.country,
      lineup: e.lineup ?? [],
      ticketUrl:
        (e.offers as Array<Record<string, unknown>>)?.find(
          (o) => o.type === 'Tickets' && o.status === 'available',
        )?.url ??
        e.url ??
        null,
    }));
    return { data: events, ttlMs: 12 * 60 * 60 * 1000 };
  },

  lyrics: async (key) => {
    // key format: "artist|title"
    const [artist, title] = key.split('|');
    if (!artist || !title) return null;
    const data = await safeFetch(
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
    );
    const result = Array.isArray(data) ? (data[0] ?? null) : null;
    const hasLyrics = !!(result?.syncedLyrics || result?.plainLyrics);
    return { data: hasLyrics ? result : null, ttlMs: 24 * 60 * 60 * 1000 };
  },
};

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.cronSync);
  if (limited) return limited;
  logRequest(req);

  // Auth check — timing-safe comparison (see ARCH-032 for rate limiting)
  const cronSecret = env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (!safeCompare(auth ?? '', `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const namespaces: Namespace[] = ['itunes', 'artist-info', 'concerts', 'lyrics'];
  const summary: Record<string, { stale: number; synced: number; failed: number }> = {};

  for (const ns of namespaces) {
    const staleKeys = getStaleKeys(ns);
    const syncer = syncers[ns];
    let synced = 0;
    let failed = 0;

    for (const key of staleKeys) {
      try {
        const result = syncer ? await syncer(key) : null;
        if (result) {
          persistToDb(ns, key, result.data, result.ttlMs);
          cacheSet(ns, key, result.data, result.ttlMs);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    summary[ns] = { stale: staleKeys.length, synced, failed };
  }

  return NextResponse.json(
    { ok: true, summary },
    {
      headers: { 'Cache-Control': 'no-cache, no-store' },
    },
  );
}
