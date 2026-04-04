/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BookItem } from '@/logic/gutenberg-api';

interface UseBooksResult {
  books: BookItem[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (q: string) => void;
  loadPage: (page: number) => void;
  page: number;
  hasMore: boolean;
}

export function useBooks(): UseBooksResult {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchBooks = useCallback(async (q: string, pg: number) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      params.set('language', 'en');
      params.set('page', String(pg));

      const res = await fetch(`/api/v1/gutenberg/books?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBooks(data.books ?? []);
      setHasMore(data.hasMore ?? false);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message ?? 'Failed to load books');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks(search, page);
    return () => controllerRef.current?.abort();
  }, [search, page, fetchBooks]);

  const setSearch = useCallback((q: string) => {
    setSearchRaw(q);
    setPage(1);
  }, []);

  const loadPage = useCallback((pg: number) => {
    setPage(pg);
  }, []);

  return { books, loading, error, search, setSearch, loadPage, page, hasMore };
}
