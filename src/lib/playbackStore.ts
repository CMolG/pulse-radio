/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import { create } from 'zustand'; export type PlaybackSource = 'radio' | null;
interface PlaybackState { source: PlaybackSource; isPlaying: boolean; currentTime: number; volume: number;
  muted: boolean; trackTitle: string; trackArtist: string; artworkUrl: string | null;
  setSource: (s: PlaybackSource) => void; setPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void; setVolume: (v: number) => void;
  setMuted: (m: boolean) => void; setTrackInfo: (title: string, artist: string, artwork?: string | null) => void; reset: () => void; }
export const usePlaybackStore = create<PlaybackState>((set) => ({
  source: null, isPlaying: false, currentTime: 0, volume: 0.8, muted: false, trackTitle: '', trackArtist: '', artworkUrl: null,
  setSource: (source) => set({ source }), setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }), setMuted: (muted) => set({ muted }),
  setTrackInfo: (title, artist, artwork) =>set({ trackTitle: title, trackArtist: artist, artworkUrl: artwork ?? null }), reset: () =>
    set({ source: null, isPlaying: false, currentTime: 0, trackTitle: '', trackArtist: '', artworkUrl: null }), }));
