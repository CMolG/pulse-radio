/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import { useState, useCallback, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import { STORAGE_KEYS } from '@/logic/storage-constants';

export interface AudiobookRecent {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  lastOpenedAt: number;
  lastTrackId?: string;
}

const MAX_RECENTS = 50;

export function useAudiobookRecents() {
  const [recents, setRecents] = useState<AudiobookRecent[]>(() =>
    loadFromStorage<AudiobookRecent[]>(STORAGE_KEYS.AUDIOBOOK_RECENTS, []),
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.AUDIOBOOK_RECENTS, recents);
  }, [recents]);

  const addRecent = useCallback((entry: Omit<AudiobookRecent, 'lastOpenedAt'>) => {
    setRecents((prev) => {
      const deduped = prev.filter((r) => r.bookId !== entry.bookId);
      const next: AudiobookRecent[] = [{ ...entry, lastOpenedAt: Date.now() }, ...deduped];
      if (next.length > MAX_RECENTS) next.length = MAX_RECENTS;
      return next;
    });
  }, []);

  const updateTrack = useCallback((bookId: string, trackId: string) => {
    setRecents((prev) => {
      const idx = prev.findIndex((r) => r.bookId === bookId);
      if (idx < 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...updated[idx], lastTrackId: trackId, lastOpenedAt: Date.now() };
      return updated;
    });
  }, []);

  const removeRecent = useCallback((bookId: string) => {
    setRecents((prev) => prev.filter((r) => r.bookId !== bookId));
  }, []);

  return { recents, addRecent, updateTrack, removeRecent };
}
