/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  type AlbumInfo,
  CACHE,
  EMPTY_ALBUM_INFO,
  FETCH_TIMEOUT,
  type ItunesResult,
  appendReferrer,
  preloadImage,
  selectBestItunesResult,
} from '@/logic/itunes-api';
import { cleanFeatFromTitle, primaryArtist } from '@/logic/format-utils';

export function useAlbumArt(title: string | null, artist: string | null) {
  const hasTitle = Boolean(title);
  const cacheKey = useMemo(
    () => (title ? `${artist ?? ''}\n${title}`.toLowerCase() : ''),
    [title, artist],
  );
  const cachedInfo = useMemo(() => {
    if (!cacheKey) return null;
    return CACHE.get(cacheKey) ?? null;
  }, [cacheKey]);
  const [fetched, setFetched] = useState<{ key: string; info: AlbumInfo } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!title || !cacheKey || cachedInfo) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const cleanArtist = artist ? primaryArtist(artist) : '';
    const cleanTitle = cleanFeatFromTitle(title);
    const term = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
    fetch(`/api/itunes?term=${encodeURIComponent(term)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const result = selectBestItunesResult(
          (data.results ?? []) as ItunesResult[],
          title,
          artist,
        );
        const artworkUrl = result?.artworkUrl100?.replace('100x100', '600x600') ?? null;
        const rawItunesUrl: string | null =
          result?.trackViewUrl ?? result?.collectionViewUrl ?? null;
        const albumInfo: AlbumInfo = {
          artworkUrl,
          albumName: result?.collectionName ?? null,
          releaseDate: result?.releaseDate ?? null,
          itunesUrl: rawItunesUrl ? appendReferrer(rawItunesUrl) : null,
          durationMs: typeof result?.trackTimeMillis === 'number' ? result.trackTimeMillis : null,
          genre: result?.primaryGenreName ?? null,
          trackNumber: typeof result?.trackNumber === 'number' ? result.trackNumber : null,
          trackCount: typeof result?.trackCount === 'number' ? result.trackCount : null,
        };
        CACHE.set(cacheKey, albumInfo);
        if (artworkUrl) preloadImage(artworkUrl);
        setFetched({ key: cacheKey, info: albumInfo });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          CACHE.set(cacheKey, EMPTY_ALBUM_INFO);
          setFetched({ key: cacheKey, info: EMPTY_ALBUM_INFO });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [title, artist, cacheKey, cachedInfo]);
  const info = !cacheKey
    ? EMPTY_ALBUM_INFO
    : (cachedInfo ?? (fetched?.key === cacheKey ? fetched.info : EMPTY_ALBUM_INFO));
  const isLoading = Boolean(hasTitle && cacheKey && !cachedInfo && fetched?.key !== cacheKey);
  return useMemo(
    () => ({ ...info, isLoading }),
    [
      info.artworkUrl,
      info.albumName,
      info.itunesUrl,
      info.durationMs,
      info.genre,
      info.releaseDate,
      info.trackNumber,
      info.trackCount,
      isLoading,
    ],
  );
}
