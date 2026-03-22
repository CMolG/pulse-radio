/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NowPlayingTrack, HistoryEntry } from '../types';
import { STORAGE_KEYS, MAX_HISTORY } from '../constants';

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
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const lastTrackRef = useRef<string>('');
  const lastStationRef = useRef<string | undefined>(stationUuid);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  // Reset track key when station changes to avoid duplicating stale metadata
  useEffect(() => {
    if (stationUuid !== lastStationRef.current) {
      lastStationRef.current = stationUuid;
      lastTrackRef.current = '';
    }
  }, [stationUuid]);

  // Add entry when track changes
  useEffect(() => {
    if (!track?.title || !stationUuid || !stationName) return;
    const key = `${stationUuid}::${track.artist}::${track.title}`;
    if (key === lastTrackRef.current) return;
    // Only add if station hasn't just changed (wait for fresh metadata)
    if (stationUuid !== lastStationRef.current) return;
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

  // Update the latest history entry when artwork/album/itunesUrl arrives late
  useEffect(() => {
    if (!track?.title || !stationUuid) return;
    const artworkUrl = track.artworkUrl;
    const album = track.album;
    const itunesUrl = track.itunesUrl;
    if (!artworkUrl && !album && !itunesUrl) return;

    setHistory(prev => {
      const head = prev[0];
      if (!head) return prev;
      if (
        head.stationUuid === stationUuid &&
        head.title === track.title &&
        head.artist === track.artist &&
        (head.artworkUrl !== artworkUrl || head.album !== album || head.itunesUrl !== itunesUrl)
      ) {
        return [{ ...head, artworkUrl, album, itunesUrl }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [track?.artworkUrl, track?.album, track?.itunesUrl, track?.title, track?.artist, stationUuid]);

  const remove = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    lastTrackRef.current = '';
  }, []);

  return { history, remove, clear };
}
