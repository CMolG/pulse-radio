/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Station, NowPlayingTrack } from '../types';

type MediaSessionConfig = {
  station: Station | null;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
};

export function useMediaSession(config: MediaSessionConfig): void {
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  const { station, track, isPlaying } = config;
  const lastMetaRef = useRef('');

  useEffect(() => {
    if (!('mediaSession' in navigator) || !station) return;

    const trackTitle = track?.title || station.name;
    const trackArtist = track?.artist || 'Internet Radio';
    const artSrc = track?.artworkUrl || station.favicon;
    const album = station.tags?.split(',')[0] || 'Live';
    const metaKey = `${trackTitle}\t${trackArtist}\t${album}\t${artSrc || ''}`;
    if (metaKey === lastMetaRef.current) return;
    lastMetaRef.current = metaKey;

    const artwork = artSrc ? [{ src: artSrc, sizes: '512x512', type: 'image/png' }] : [];

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: trackArtist,
        album,
        artwork,
      });
    } catch { /* MediaMetadata constructor can throw on malformed artwork data */ }
  }, [station, track]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const setupHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [ ['play', () => configRef.current.onPlay()],
      ['pause', () => configRef.current.onPause()],
      ['nexttrack', () => configRef.current.onNext()],
      ['previoustrack', () => configRef.current.onPrev()],
      ['stop', () => configRef.current.onStop()],
      ['seekbackward', () => { if (configRef.current.onSeekBackward) configRef.current.onSeekBackward(); }],
      ['seekforward', () => { if (configRef.current.onSeekForward) configRef.current.onSeekForward(); }],
    ];

    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action, handler); }
      catch { /* not supported */ }
    }

    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); }
        catch { /* ok */ }
      }
    };
  }, []);

  useEffect(setupHandlers, [setupHandlers]);
}
