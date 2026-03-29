/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import type { StationListenTime, SongPlayCount, ArtistPlayCount, GenrePlayCount } from '@/components/radio/constants';
import { STORAGE_KEYS } from '@/components/radio/constants';
import { useStorageSync } from './useStorageSync';

const SAVE_INTERVAL_MS = 10_000;
const MAX_STATIONS = 300;
const MAX_SONGS = 500;
const MAX_ARTISTS = 200;
const MAX_GENRES = 100;

interface UsageStats {
  stationListenTimes: Record<string, StationListenTime>;
  songPlayCounts: Record<string, SongPlayCount>;
  artistPlayCounts: Record<string, ArtistPlayCount>;
  genrePlayCounts: Record<string, GenrePlayCount>;
  totalListenMs: number;
}

const EMPTY_STATS: UsageStats = {
  stationListenTimes: {},
  songPlayCounts: {},
  artistPlayCounts: {},
  genrePlayCounts: {},
  totalListenMs: 0,
};

/** Keep only the top N entries by a numeric field, dropping the lowest */
function pruneTop<T>(
  map: Record<string, T>,
  max: number,
  key: keyof T,
): Record<string, T> {
  const entries = Object.entries(map);
  if (entries.length <= max) return map;
  return Object.fromEntries(
    entries.sort((a, b) => (b[1][key] as number) - (a[1][key] as number)).slice(0, max),
  );
}

/** Return top N values from a record, sorted descending by a numeric field */
function topN<T>(
  map: Record<string, T>,
  key: keyof T,
  n: number,
): T[] {
  return Object.values(map)
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .slice(0, n);
}

const ARTIST_SPLIT_RE = /[,;&]|feat\.|ft\.|featuring|vs\.?/i;
function primaryArtist(artist: string): string {
  return artist.split(ARTIST_SPLIT_RE)[0].trim();
}

export function useStats() {
  const [stats, setStats] = useState<UsageStats>(() =>
    loadFromStorage<UsageStats>(STORAGE_KEYS.USAGE_STATS, EMPTY_STATS),
  );
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  useStorageSync<UsageStats>(
    STORAGE_KEYS.USAGE_STATS,
    setStats,
    (v): v is UsageStats => !!v && typeof (v as UsageStats).totalListenMs === 'number',
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const persist = useCallback(() => {
    if (dirtyRef.current) {
      const current = statsRef.current;
      const pStations = pruneTop(current.stationListenTimes, MAX_STATIONS, 'totalMs');
      const pSongs = pruneTop(current.songPlayCounts, MAX_SONGS, 'count');
      const pArtists = pruneTop(current.artistPlayCounts, MAX_ARTISTS, 'count');
      const pGenres = pruneTop(current.genrePlayCounts, MAX_GENRES, 'count');
      const didPrune =
        pStations !== current.stationListenTimes ||
        pSongs !== current.songPlayCounts ||
        pArtists !== current.artistPlayCounts ||
        pGenres !== current.genrePlayCounts;
      if (didPrune) {
        const pruned: UsageStats = {
          ...current,
          stationListenTimes: pStations,
          songPlayCounts: pSongs,
          artistPlayCounts: pArtists,
          genrePlayCounts: pGenres,
        };
        setStats(pruned);
        saveToStorage(STORAGE_KEYS.USAGE_STATS, pruned);
      } else saveToStorage(STORAGE_KEYS.USAGE_STATS, current);
      dirtyRef.current = false;
    }
  }, []);
  useEffect(() => {
    saveTimerRef.current = setInterval(persist, SAVE_INTERVAL_MS);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      persist();
    };
  }, [persist]);
  const tickListenTime = useCallback(
    (stationUuid: string, stationName: string, deltaMs: number) => {
      if (deltaMs <= 0 || !stationUuid) return;
      setStats((prev) => {
        const entry = prev.stationListenTimes[stationUuid] ?? {
          name: stationName,
          uuid: stationUuid,
          totalMs: 0,
        };
        return {
          ...prev,
          stationListenTimes: {
            ...prev.stationListenTimes,
            [stationUuid]: { ...entry, name: stationName, totalMs: entry.totalMs + deltaMs },
          },
          totalListenMs: prev.totalListenMs + deltaMs,
        };
      });
      dirtyRef.current = true;
    },
    [],
  );
  const recordSongPlay = useCallback(
    (title: string, artist: string, genre?: string, artworkUrl?: string) => {
      if (!title) return;
      const songKey = `${title}|||${artist}`;
      const primary = primaryArtist(artist);
      setStats((prev) => {
        const songEntry = prev.songPlayCounts[songKey] ?? { title, artist, count: 0 };
        const artistEntry = prev.artistPlayCounts[primary] ?? { name: primary, count: 0 };
        const normalizedGenre = genre ? genre.toLowerCase().trim() : undefined;
        const next: UsageStats = {
          ...prev,
          songPlayCounts: {
            ...prev.songPlayCounts,
            [songKey]: {
              ...songEntry,
              count: songEntry.count + 1,
              artworkUrl: artworkUrl ?? songEntry.artworkUrl,
              genre: normalizedGenre ?? songEntry.genre,
            },
          },
          artistPlayCounts: {
            ...prev.artistPlayCounts,
            [primary]: { ...artistEntry, count: artistEntry.count + 1 },
          },
        };
        if (normalizedGenre) {
          const genreEntry = prev.genrePlayCounts[normalizedGenre] ?? {
            genre: normalizedGenre,
            count: 0,
          };
          next.genrePlayCounts = {
            ...prev.genrePlayCounts,
            [normalizedGenre]: { ...genreEntry, count: genreEntry.count + 1 },
          };
        }
        return next;
      });
      dirtyRef.current = true;
    },
    [],
  );
  const topStations = useMemo(
    () => topN(stats.stationListenTimes, 'totalMs', 10),
    [stats.stationListenTimes],
  );
  const topSongs = useMemo(() => topN(stats.songPlayCounts, 'count', 10), [stats.songPlayCounts]);
  const topArtists = useMemo(
    () => topN(stats.artistPlayCounts, 'count', 10),
    [stats.artistPlayCounts],
  );
  const sortedGenres = useMemo(
    () => Object.values(stats.genrePlayCounts).sort((a, b) => b.count - a.count),
    [stats.genrePlayCounts],
  );
  const topGenres = useMemo(() => sortedGenres.slice(0, 10), [sortedGenres]);
  const genreOrder = useMemo(() => sortedGenres.map((g) => g.genre), [sortedGenres]);
  const updateSongMeta = useCallback(
    (title: string, artist: string, genre?: string, artworkUrl?: string) => {
      if (!title) return;
      const key = `${title}|||${artist}`;
      setStats((prev) => {
        const songEntry = prev.songPlayCounts[key];
        if (!songEntry) return prev;
        const needsArtwork = artworkUrl && songEntry.artworkUrl !== artworkUrl;
        const normalizedGenre = genre ? genre.toLowerCase().trim() : '';
        const needsGenre = normalizedGenre && songEntry.genre !== normalizedGenre;
        if (!needsArtwork && !needsGenre) return prev;
        const next: UsageStats = {
          ...prev,
          songPlayCounts: {
            ...prev.songPlayCounts,
            [key]: {
              ...songEntry,
              ...(needsArtwork ? { artworkUrl } : {}),
              ...(needsGenre ? { genre: normalizedGenre } : {}),
            },
          },
        };
        if (needsGenre) {
          const genreEntry = prev.genrePlayCounts[normalizedGenre] ?? {
            genre: normalizedGenre,
            count: 0,
          };
          next.genrePlayCounts = {
            ...prev.genrePlayCounts,
            [normalizedGenre]: { ...genreEntry, count: genreEntry.count + 1 },
          };
        }
        return next;
      });
      dirtyRef.current = true;
    },
    [],
  );
  const clearStats = useCallback(() => {
    setStats(EMPTY_STATS);
    saveToStorage(STORAGE_KEYS.USAGE_STATS, EMPTY_STATS);
  }, []);
  return {
    stats,
    tickListenTime,
    recordSongPlay,
    updateSongMeta,
    topStations,
    topSongs,
    topArtists,
    topGenres,
    genreOrder,
    clearStats,
  };
}
