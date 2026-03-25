/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import { useState, useCallback, useEffect, useMemo, useRef } from 'react'; import type { FavoriteSong } from '../types'; import { STORAGE_KEYS } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils'; import { useStorageSync } from '@/lib/useStorageSync'; function songKey(title: string, artist: string) { return `${title}|||${artist}`; }
/** Build a Set of songKeys from a song array for O(1) lookups. */
function buildKeySet(songs: FavoriteSong[]): Set<string> { const s = new Set<string>(); for (let i = 0; i < songs.length; i++) { s.add(songKey(songs[i].title, songs[i].artist)); } return s; } export function useFavoriteSongs() { const MAX_SONGS = 500; const [songs, setSongs] = useState<FavoriteSong[]>(() => {
    const loaded = loadFromStorage<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, []); const seen = new Set<string>(); // Dedup on load in case of corrupted storage
    return loaded.filter(s => {
      const key = songKey(s.title, s.artist); if (seen.has(key)) return false; seen.add(key); return true;}); });
  // O(1) lookup Set — rebuilt only when songs array changes
  const keySetRef = useRef(buildKeySet(songs)); useMemo(() => { keySetRef.current = buildKeySet(songs); }, [songs]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.FAVORITE_SONGS, songs); }, [songs]); useStorageSync<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, setSongs); const prepend = (song: Omit<FavoriteSong, 'id' | 'timestamp'>, prev: FavoriteSong[]) => {
    const entry: FavoriteSong = { ...song, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now() }; const next = [entry, ...prev]; return next.length > MAX_SONGS ? next.slice(0, MAX_SONGS) : next; };
  const add = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs(prev => keySetRef.current.has(songKey(song.title, song.artist)) ? prev : prepend(song, prev));
  }, []); const remove = useCallback((id: string) => { setSongs(prev => prev.filter(s => s.id !== id)); }, []); const toggle = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => { setSongs(prev => {
      const key = songKey(song.title, song.artist); const exists = prev.find(s => songKey(s.title, s.artist) === key); return exists ? prev.filter(s => s.id !== exists.id) : prepend(song, prev);});
  }, []); const has = useCallback((title: string, artist: string) => keySetRef.current.has(songKey(title, artist)), []); const clear = useCallback(() => setSongs([]), []); return { songs, add, remove, toggle, has, clear }; }
