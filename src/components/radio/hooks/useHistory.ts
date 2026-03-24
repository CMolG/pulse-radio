/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NowPlayingTrack, HistoryEntry } from '../types';
import { STORAGE_KEYS, MAX_HISTORY } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

export type UseHistoryReturn = {
  history: HistoryEntry[];
  remove: (id: string) => void;
  clear: () => void;
};

export function useHistory(
  stationName: string | undefined,
  stationUuid: string | undefined,
  track: NowPlayingTrack | null,
): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const loaded = loadFromStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
    // Dedup by id on load in case of corrupted storage
    const seen = new Set<string>();
    return loaded.filter(e => {
      if (!e.id || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  });

  const lastTrackRef = useRef<string>('');
  const lastStationRef = useRef<string | undefined>(stationUuid);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.HISTORY, history);
  }, [history]);

  // Sync history across tabs via storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.HISTORY || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as HistoryEntry[];
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch { /* ignore malformed */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Add entry when track changes; handles station transitions in a single effect
  // to prevent the race between station-reset and track-add
  useEffect(() => {
    if (!track?.title || !stationUuid || !stationName) return;

    // Station just changed — skip this render's potentially stale metadata
    if (stationUuid !== lastStationRef.current) {
      lastStationRef.current = stationUuid;
      lastTrackRef.current = '';
      return;
    }

    const key = `${stationUuid}::${track.artist}::${track.title}`;
    if (key === lastTrackRef.current) return;
    lastTrackRef.current = key;

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stationName,
      stationUuid,
      artist: track.artist,
      title: track.title,
      album: track.album,
      artworkUrl: track.artworkUrl,
      itunesUrl: track.itunesUrl,
      durationMs: track.durationMs,
      genre: track.genre,
      releaseDate: track.releaseDate,
      trackNumber: track.trackNumber,
      trackCount: track.trackCount,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Active dedup: remove older entries with same title+artist+station
      const deduped = prev.filter(
        e => !(e.title === entry.title && e.artist === entry.artist && e.stationUuid === entry.stationUuid)
      );
      return [entry, ...deduped].slice(0, MAX_HISTORY);
    });
  // Only trigger on title/artist change — NOT on artworkUrl/album which arrive late
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.title, track?.artist, stationUuid, stationName]);

  // Update the latest history entry when artwork/album/itunesUrl/metadata arrives late
  useEffect(() => {
    if (!track?.title || !stationUuid) return;
    const artworkUrl = track.artworkUrl;
    const album = track.album;
    const itunesUrl = track.itunesUrl;
    const durationMs = track.durationMs;
    const genre = track.genre;
    const releaseDate = track.releaseDate;
    const trackNumber = track.trackNumber;
    const trackCount = track.trackCount;
    if (!artworkUrl && !album && !itunesUrl && !durationMs && !genre && !releaseDate && trackNumber == null && trackCount == null) return;

    setHistory(prev => {
      const head = prev[0];
      if (!head) return prev;
      if (
        head.stationUuid === stationUuid &&
        head.title === track.title &&
        head.artist === track.artist &&
        (head.artworkUrl !== artworkUrl || head.album !== album || head.itunesUrl !== itunesUrl ||
         head.durationMs !== durationMs || head.genre !== genre || head.releaseDate !== releaseDate ||
         head.trackNumber !== trackNumber || head.trackCount !== trackCount)
      ) {
        return [{ ...head, artworkUrl, album, itunesUrl, durationMs, genre, releaseDate, trackNumber, trackCount }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [track?.artworkUrl, track?.album, track?.itunesUrl, track?.durationMs, track?.genre, track?.releaseDate, track?.trackNumber, track?.trackCount, track?.title, track?.artist, stationUuid]);

  const remove = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    lastTrackRef.current = '';
  }, []);

  return { history, remove, clear };
}
