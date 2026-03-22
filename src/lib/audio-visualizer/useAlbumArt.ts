/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { useState, useEffect, useRef } from 'react';

const FETCH_TIMEOUT = 8_000;

interface AlbumInfo {
  artworkUrl: string | null;
  albumName: string | null;
  releaseDate: string | null;
  itunesUrl: string | null;
}

const CACHE = new Map<string, AlbumInfo>();

const ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';

function appendReferrer(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${ITUNES_REFERRER}`;
}

/** Preload an image so it's already in the browser cache when rendered. */
function preloadImage(url: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onerror = () => { img.src = ''; }; // release failed load
  img.src = url;
}

export interface UseAlbumArtReturn {
  artworkUrl: string | null;
  albumName: string | null;
  releaseDate: string | null;
  itunesUrl: string | null;
  isLoading: boolean;
}

export function useAlbumArt(
  title: string | null,
  artist: string | null,
): UseAlbumArtReturn {
  const [info, setInfo] = useState<AlbumInfo>({ artworkUrl: null, albumName: null, releaseDate: null, itunesUrl: null });
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Need at least a title to search
    if (!title) {
      setInfo({ artworkUrl: null, albumName: null, releaseDate: null, itunesUrl: null });
      return;
    }

    const cacheKey = `${artist ?? ''}::${title}`.toLowerCase();
    if (CACHE.has(cacheKey)) {
      setInfo(CACHE.get(cacheKey)!);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Use server-side proxy to avoid CORS/CSP issues from the browser
    const term = artist ? `${artist} ${title}` : title;
    fetch(
      `/api/itunes?term=${encodeURIComponent(term)}`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        const result = data.results?.[0];
        const artworkUrl = result?.artworkUrl100?.replace('100x100', '600x600') ?? null;
        const rawItunesUrl: string | null = result?.trackViewUrl ?? result?.collectionViewUrl ?? null;
        const albumInfo: AlbumInfo = {
          artworkUrl,
          albumName: result?.collectionName ?? null,
          releaseDate: result?.releaseDate?.slice(0, 4) ?? null,
          itunesUrl: rawItunesUrl ? appendReferrer(rawItunesUrl) : null,
        };
        CACHE.set(cacheKey, albumInfo);
        if (artworkUrl) preloadImage(artworkUrl);
        setInfo(albumInfo);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          const empty: AlbumInfo = { artworkUrl: null, albumName: null, releaseDate: null, itunesUrl: null };
          CACHE.set(cacheKey, empty);
          setInfo(empty);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, [title, artist]);

  return { ...info, isLoading };
}
