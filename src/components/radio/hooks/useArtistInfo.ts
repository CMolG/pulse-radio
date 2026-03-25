/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import { useState, useEffect, useMemo } from 'react'; import type { ArtistInfo } from '../types'; import { LRU } from '@/lib/lruCache';
const cache = new LRU<ArtistInfo>(200);
export function useArtistInfo(artist: string | null): { info: ArtistInfo | null; loading: boolean; } { const key = artist ? artist.toLowerCase().trim() : ''; const cachedInfo = useMemo(() => { if (!key) return null; return cache.get(key) ?? null; }, [key]); const [fetched, setFetched] = useState<{ key: string; info: ArtistInfo | null } | null>(null); useEffect(() => { if (!key || !artist || cachedInfo) return; let cancelled = false; const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15_000); fetch(`/api/artist-info?artist=${encodeURIComponent(artist)}`, { signal: controller.signal }).then((r) => { // Abort after 15s if the API doesn't respond (server-side has 8s per upstream call)
        if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json();
      }).then((data: ArtistInfo) => { if (!cancelled) { cache.set(key, data); setFetched({ key, info: data }); } }).catch(() => { if (!cancelled) setFetched({ key, info: null }); }).finally(() => { clearTimeout(timeout); });
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [artist, key, cachedInfo]); const info = !key ? null : cachedInfo ?? (fetched?.key === key ? fetched.info : null); return { info, loading: Boolean(key && !cachedInfo && fetched?.key !== key) }; }
