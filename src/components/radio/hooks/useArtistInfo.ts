/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useEffect } from 'react';
import type { ArtistInfo } from '../types';

const MAX_CACHE = 200;
const cache = new Map<string, ArtistInfo>();

function cacheGet(key: string): ArtistInfo | undefined {
  const val = cache.get(key);
  if (val !== undefined) {
    // Move to end (most recently used)
    cache.delete(key);
    cache.set(key, val);
  }
  return val;
}

function cacheSet(key: string, val: ArtistInfo) {
  cache.delete(key); // ensure fresh insertion order
  cache.set(key, val);
  // Evict oldest entries beyond capacity
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
    else break;
  }
}

export function useArtistInfo(artist: string | null): {
  info: ArtistInfo | null;
  loading: boolean;
} {
  const [info, setInfo] = useState<ArtistInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!artist) {
      setInfo(null);
      return;
    }

    const key = artist.toLowerCase().trim();
    const cached = cacheGet(key);
    if (cached) {
      setInfo(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setInfo(null);

    fetch(`/api/artist-info?artist=${encodeURIComponent(artist)}`)
      .then((r) => r.json())
      .then((data: ArtistInfo) => {
        if (!cancelled) {
          cacheSet(key, data);
          setInfo(data);
        }
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist]);

  return { info, loading };
}
