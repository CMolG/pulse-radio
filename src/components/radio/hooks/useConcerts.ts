/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useEffect } from 'react';
import { LRU } from '@/logic/audio-context';

interface ConcertEvent {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  lineup: string[];
  ticketUrl: string | null;
}

const ARTIST_SPLIT_RE = /[,;&]|feat\.|ft\.|featuring|vs\.?/i;
function primaryArtist(artist: string): string {
  return artist.split(ARTIST_SPLIT_RE)[0].trim();
}

const _concertsCache = new LRU<ConcertEvent[]>(64);

export function useConcerts(artist: string | null | undefined, enabled: boolean) {
  const [concerts, setConcerts] = useState<ConcertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const key = artist ? primaryArtist(artist).toLowerCase().trim() : null;
  useEffect(() => {
    if (!enabled || !key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConcerts([]);
      return;
    }
    const cached = _concertsCache.get(key);
    if (cached) {
      setConcerts(cached);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/concerts?artist=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ConcertEvent[]) => {
        const list = Array.isArray(data) ? data : [];
        _concertsCache.set(key, list);
        setConcerts(list);
      })
      .catch(() => {
        /* silently ignore */
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [key, enabled]);
  return { concerts, loading };
}
