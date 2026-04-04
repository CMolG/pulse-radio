/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AudiobookItem } from '@/logic/librivox-api';

interface UseAudiobooksResult {
  books: AudiobookItem[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  query: string;
}

const PAGE_SIZE = 20;

export function useAudiobooks(): UseAudiobooksResult {
  const [books, setBooks] = useState<AudiobookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async (searchQuery: string, offset: number, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (searchQuery.trim()) {
        params.set('title', searchQuery.trim());
      }
      const res = await fetch(`/api/v1/librivox/audiobooks?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { books: AudiobookItem[] };
      const incoming = Array.isArray(json.books) ? json.books : [];
      setBooks((prev) => (append ? [...prev, ...incoming] : incoming));
      setHasMore(incoming.length >= PAGE_SIZE);
      offsetRef.current = offset + incoming.length;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message ?? 'Failed to load audiobooks');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      offsetRef.current = 0;
      fetchBooks(q, 0, false);
    },
    [fetchBooks],
  );

  const loadMore = useCallback(() => {
    if (loading) return;
    fetchBooks(query, offsetRef.current, true);
  }, [fetchBooks, loading, query]);

  // Initial load
  useEffect(() => {
    fetchBooks('', 0, false);
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { books, loading, error, search, loadMore, hasMore, query };
}
