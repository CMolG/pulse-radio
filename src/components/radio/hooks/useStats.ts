/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

const STORAGE_KEY = 'radio-usage-stats';
const SAVE_INTERVAL_MS = 10_000;

export interface StationListenTime {
  name: string;
  uuid: string;
  totalMs: number;
}

export interface SongPlayCount {
  title: string;
  artist: string;
  count: number;
  artworkUrl?: string;
}

export interface ArtistPlayCount {
  name: string;
  count: number;
}

export interface GenrePlayCount {
  genre: string;
  count: number;
}

export interface UsageStats {
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

function primaryArtist(artist: string): string {
  // Split by common artist separators, take the first
  return artist.split(/[,;&]|feat\.|ft\.|featuring|vs\.?/i)[0].trim();
}

export function useStats() {
  const [stats, setStats] = useState<UsageStats>(() =>
    loadFromStorage<UsageStats>(STORAGE_KEY, EMPTY_STATS),
  );

  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // Persist periodically and on unmount
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const persist = useCallback(() => {
    if (dirtyRef.current) {
      saveToStorage(STORAGE_KEY, statsRef.current);
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

  // Track listen time for a station (call periodically while playing)
  const tickListenTime = useCallback((stationUuid: string, stationName: string, deltaMs: number) => {
    if (deltaMs <= 0 || !stationUuid) return;
    setStats(prev => {
      const entry = prev.stationListenTimes[stationUuid] ?? { name: stationName, uuid: stationUuid, totalMs: 0 };
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
  }, []);

  // Record a song play
  const recordSongPlay = useCallback((title: string, artist: string, genre?: string, artworkUrl?: string) => {
    if (!title) return;
    const songKey = `${title}|||${artist}`;
    const primary = primaryArtist(artist);

    setStats(prev => {
      const songEntry = prev.songPlayCounts[songKey] ?? { title, artist, count: 0 };
      const artistEntry = prev.artistPlayCounts[primary] ?? { name: primary, count: 0 };

      const next: UsageStats = {
        ...prev,
        songPlayCounts: {
          ...prev.songPlayCounts,
          [songKey]: { ...songEntry, count: songEntry.count + 1, artworkUrl: artworkUrl ?? songEntry.artworkUrl },
        },
        artistPlayCounts: {
          ...prev.artistPlayCounts,
          [primary]: { ...artistEntry, count: artistEntry.count + 1 },
        },
      };

      if (genre) {
        const normalizedGenre = genre.toLowerCase().trim();
        const genreEntry = prev.genrePlayCounts[normalizedGenre] ?? { genre: normalizedGenre, count: 0 };
        next.genrePlayCounts = {
          ...prev.genrePlayCounts,
          [normalizedGenre]: { ...genreEntry, count: genreEntry.count + 1 },
        };
      }

      return next;
    });
    dirtyRef.current = true;
  }, []);

  // Derived sorted lists
  const topStations = useCallback((limit = 10) => {
    return Object.values(statsRef.current.stationListenTimes)
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, limit);
  }, []);

  const topSongs = useCallback((limit = 10) => {
    return Object.values(statsRef.current.songPlayCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, []);

  const topArtists = useCallback((limit = 10) => {
    return Object.values(statsRef.current.artistPlayCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, []);

  const topGenres = useCallback((limit = 10) => {
    return Object.values(statsRef.current.genrePlayCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, []);

  // Get genre ordering for home reorder
  const genreOrder = useCallback(() => {
    return Object.values(statsRef.current.genrePlayCounts)
      .sort((a, b) => b.count - a.count)
      .map(g => g.genre);
  }, []);

  const clearStats = useCallback(() => {
    setStats(EMPTY_STATS);
    saveToStorage(STORAGE_KEY, EMPTY_STATS);
  }, []);

  return {
    stats,
    tickListenTime,
    recordSongPlay,
    topStations,
    topSongs,
    topArtists,
    topGenres,
    genreOrder,
    clearStats,
  };
}
