/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useEffect } from 'react';
import type { ArtistInfo } from '../types';

const cache = new Map<string, ArtistInfo>();

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
    const cached = cache.get(key);
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
          cache.set(key, data);
          setInfo(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist]);

  return { info, loading };
}
