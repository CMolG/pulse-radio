/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { BookItem, BookContentPayload, BookContentPage } from '@/logic/gutenberg-api';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import { STORAGE_KEYS } from '@/logic/storage-constants';

export interface ReadingPreferences {
  fontSize: number;
  lineHeight: number;
  theme: 'day' | 'sepia' | 'night';
}

const DEFAULT_PREFS: ReadingPreferences = {
  fontSize: 18,
  lineHeight: 1.8,
  theme: 'sepia',
};

interface BookProgress {
  [bookId: string]: number;
}

interface UseBookReaderResult {
  content: BookContentPayload | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  pages: BookContentPage[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  preferences: ReadingPreferences;
  setPreferences: (prefs: Partial<ReadingPreferences>) => void;
}

export function useBookReader(book: BookItem | null): UseBookReaderResult {
  const [content, setContent] = useState<BookContentPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [preferences, setPreferencesRaw] = useState<ReadingPreferences>(() =>
    loadFromStorage<ReadingPreferences>(STORAGE_KEYS.BOOK_READER_PREFS, DEFAULT_PREFS),
  );
  const controllerRef = useRef<AbortController | null>(null);

  // Load saved progress when book changes
  useEffect(() => {
    if (!book) return;
    const progress = loadFromStorage<BookProgress>(STORAGE_KEYS.BOOK_PROGRESS, {});
    const saved = progress[book.id];
    if (typeof saved === 'number') setCurrentPage(saved);
    else setCurrentPage(0);
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content
  useEffect(() => {
    if (!book) {
      setContent(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/v1/gutenberg/books/${book.id}/content`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: BookContentPayload = await res.json();
        setContent(data);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message ?? 'Failed to load book');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress on page change
  useEffect(() => {
    if (!book) return;
    const progress = loadFromStorage<BookProgress>(STORAGE_KEYS.BOOK_PROGRESS, {});
    progress[book.id] = currentPage;
    saveToStorage(STORAGE_KEYS.BOOK_PROGRESS, progress);
  }, [book?.id, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save recent book
  useEffect(() => {
    if (!book) return;
    const recents = loadFromStorage<BookItem[]>(STORAGE_KEYS.BOOK_RECENTS, []);
    const filtered = recents.filter((b) => b.id !== book.id);
    filtered.unshift(book);
    saveToStorage(STORAGE_KEYS.BOOK_RECENTS, filtered.slice(0, 20));
  }, [book]);

  const totalPages = content?.totalPages ?? 0;
  const pages = content?.pages ?? [];

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const setPreferences = useCallback((patch: Partial<ReadingPreferences>) => {
    setPreferencesRaw((prev) => {
      const next = { ...prev, ...patch };
      saveToStorage(STORAGE_KEYS.BOOK_READER_PREFS, next);
      return next;
    });
  }, []);

  return {
    content,
    loading,
    error,
    currentPage,
    totalPages,
    pages,
    goToPage,
    nextPage,
    prevPage,
    preferences,
    setPreferences,
  };
}
