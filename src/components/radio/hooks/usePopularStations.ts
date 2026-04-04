/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useEffect, useRef } from 'react';
import type { Station } from '../schemas';

export type PopularStation = {
  station: Station;
  score: number;
  liveTrack: { title: string; artist: string } | null;
};

const POLL_INTERVAL_MS = 15_000;

export function usePopularStations() {
  const [stations, setStations] = useState<PopularStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let abortController = new AbortController();

    const fetchData = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/v1/popular-stations', {
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error('fetch failed');
        const data: PopularStation[] = await res.json();
        if (mountedRef.current) {
          setStations(data);
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
        }
      }
    };

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        abortController = new AbortController();
        await fetchData();
        if (mountedRef.current) schedule();
      }, POLL_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        abortController = new AbortController();
        fetchData();
      }
    };

    fetchData();
    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mountedRef.current = false;
      abortController.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return { stations, loading, error };
}
