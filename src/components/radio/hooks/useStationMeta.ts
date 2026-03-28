/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useEffect, useRef, useState } from 'react';

import {
  fetchIcyMeta,
  parseTrack,
  isAdContent,
  POLL_INTERVAL_MS,
  CODEC_MAP,
} from '@/logic/station-meta';
import type { Station, NowPlayingTrack } from '@/components/radio/constants';

export function useStationMeta(station: Station | null, isPlaying: boolean) {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [icyBitrate, setIcyBitrate] = useState<string | null>(null);
  const [streamCodec, setStreamCodec] = useState<string | null>(null);
  const [stationBlacklisted, setStationBlacklisted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTitleRef = useRef<string>('');
  const prevStationUrlRef = useRef<string | null>(null);
  const [prevStationId, setPrevStationId] = useState(station?.url_resolved ?? null);
  const currentStationId = station?.url_resolved ?? null;
  if (currentStationId !== prevStationId) {
    setPrevStationId(currentStationId);
    if (!station) {
      setTrack(null);
      setIcyBitrate(null);
      setStreamCodec(null);
    }
  }
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!station) {
      lastTitleRef.current = '';
      prevStationUrlRef.current = null;
      setStationBlacklisted(false);
      return;
    }
    const stationChanged = station.url_resolved !== prevStationUrlRef.current;
    if (stationChanged) {
      prevStationUrlRef.current = station.url_resolved;
      lastTitleRef.current = '';
    }
    const abortController = new AbortController();
    const poll = async () => {
      if (abortController.signal.aborted || document.hidden) return;
      const { streamTitle, icyBr, blacklisted } = await fetchIcyMeta(
        station.url_resolved,
        abortController.signal,
      );
      if (abortController.signal.aborted) return;
      if (blacklisted) {
        setStationBlacklisted(true);
        return;
      }
      setStationBlacklisted(false);
      if (icyBr) setIcyBitrate(icyBr);
      if (station.codec) {
        const c = station.codec.toUpperCase();
        setStreamCodec(CODEC_MAP[c] ?? c);
      }
      if (streamTitle && streamTitle !== lastTitleRef.current) {
        lastTitleRef.current = streamTitle;
        const parsed = !isAdContent(streamTitle) ? parseTrack(streamTitle, station.name) : null;
        setTrack(parsed && !isAdContent(parsed.title) ? parsed : null);
        return;
      }
      if (streamTitle) return;
      if (!lastTitleRef.current) setTrack(null);
    };
    if (stationChanged || isPlaying) poll();
    if (isPlaying) intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        poll();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        }
      } else if (document.visibilityState === 'hidden') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      abortController.abort();
    };
  }, [station, isPlaying]);
  return {
    track: station ? track : null,
    icyBitrate: station ? icyBitrate : null,
    streamCodec: station ? streamCodec : null,
    stationBlacklisted,
  };
}
