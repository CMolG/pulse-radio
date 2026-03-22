/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import type { BrowseCategory, EqBand, EqPreset } from './types';

export const STORAGE_KEYS = {
  PLAYBACK: 'radio-playback',
  FAVORITES: 'radio-favorites',
  RECENT: 'radio-recent',
  VOLUME: 'radio-volume',
  EQ_BANDS: 'radio-eq-bands',
  LYRICS_CACHE: 'radio-lyrics-cache',
  CUSTOM_EQ_PRESETS: 'radio-custom-eq-presets',
  HISTORY: 'radio-history',
  FAVORITE_SONGS: 'radio-favorite-songs',
  SIDEBAR_COLLAPSED: 'radio-sidebar-collapsed',
} as const;

export const MAX_RECENT = 15;
export const MAX_HISTORY = 100;

export const GENRE_CATEGORIES: BrowseCategory[] = [
  { id: 'pop',        label: 'Pop',        tag: 'pop',        gradient: 'from-pink-500 to-rose-600' },
  { id: 'rock',       label: 'Rock',       tag: 'rock',       gradient: 'from-red-600 to-orange-600' },
  { id: 'jazz',       label: 'Jazz',       tag: 'jazz',       gradient: 'from-amber-500 to-yellow-600' },
  { id: 'classical',  label: 'Classical',  tag: 'classical',  gradient: 'from-indigo-500 to-purple-600' },
  { id: 'electronic', label: 'Electronic', tag: 'electronic', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'hiphop',     label: 'Hip-Hop',    tag: 'hip hop',    gradient: 'from-zinc-500 to-zinc-700' },
  { id: 'country',    label: 'Country',    tag: 'country',    gradient: 'from-amber-600 to-orange-700' },
  { id: 'ambient',    label: 'Ambient',    tag: 'ambient',    gradient: 'from-teal-500 to-emerald-600' },
  { id: 'lofi',       label: 'Lo-Fi',      tag: 'lofi',       gradient: 'from-slate-500 to-zinc-600' },
  { id: 'news',       label: 'News',       tag: 'news',       gradient: 'from-sky-500 to-blue-700' },
  { id: 'latin',      label: 'Latin',      tag: 'latin',      gradient: 'from-orange-500 to-red-500' },
  { id: 'metal',      label: 'Metal',      tag: 'metal',      gradient: 'from-gray-600 to-zinc-800' },
  { id: 'trending',   label: 'Trending',   tag: '',          gradient: 'from-yellow-400 to-orange-500' },
  { id: 'local',      label: 'Local',      tag: '',          gradient: 'from-green-400 to-emerald-500' },
  { id: 'world',      label: 'World',      tag: 'world',     gradient: 'from-blue-400 to-indigo-500' },
];

export const GENRE_GRADIENTS: Record<string, string> = {
  pop: 'linear-gradient(135deg, #ec4899, #e11d48)',
  rock: 'linear-gradient(135deg, #dc2626, #ea580c)',
  jazz: 'linear-gradient(135deg, #f59e0b, #ca8a04)',
  classical: 'linear-gradient(135deg, #6366f1, #9333ea)',
  electronic: 'linear-gradient(135deg, #06b6d4, #2563eb)',
  hiphop: 'linear-gradient(135deg, #5a5a5a, #3a3a3a)',
  country: 'linear-gradient(135deg, #d97706, #c2410c)',
  ambient: 'linear-gradient(135deg, #14b8a6, #059669)',
  lofi: 'linear-gradient(135deg, #64748b, #52525b)',
  news: 'linear-gradient(135deg, #0ea5e9, #1d4ed8)',
  latin: 'linear-gradient(135deg, #f97316, #ef4444)',
  metal: 'linear-gradient(135deg, #4b5563, #27272a)',
  trending: 'linear-gradient(135deg, #facc15, #f97316)',
  local: 'linear-gradient(135deg, #4ade80, #10b981)',
  world: 'linear-gradient(135deg, #60a5fa, #6366f1)',
  default: 'linear-gradient(135deg, #34c759, #0a84ff)',
};

export const EQ_BANDS: EqBand[] = [
  { id: 'low',     frequency: 60,    type: 'lowshelf',  gain: 0, label: '60' },
  { id: 'lo-mid',  frequency: 230,   type: 'peaking',   gain: 0, label: '230' },
  { id: 'mid',     frequency: 910,   type: 'peaking',   gain: 0, label: '910' },
  { id: 'hi-mid',  frequency: 3600,  type: 'peaking',   gain: 0, label: '3.6k' },
  { id: 'high',    frequency: 14000, type: 'highshelf', gain: 0, label: '14k' },
];

export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat',       gains: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [6, 4, 0, 0, 0] },
  { name: 'Treble',     gains: [0, 0, 0, 3, 6] },
  { name: 'V-Shape',    gains: [5, 2, -2, 2, 5] },
  { name: 'Vocal',      gains: [-2, 0, 4, 3, 0] },
  { name: 'Rock',       gains: [4, 2, -1, 3, 4] },
  { name: 'Electronic', gains: [5, 3, -1, 2, 6] },
  { name: 'Acoustic',   gains: [0, 1, -1, 2, 0] },
];

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  return String.fromCodePoint(
    ...upper.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

export const COUNTRY_CATEGORIES = [
  { code: 'US', name: 'The United States Of America' },
  { code: 'GB', name: 'The United Kingdom Of Great Britain And Northern Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'The Republic Of Korea' },
  { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'NL', name: 'The Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SE', name: 'Sweden' },
  { code: 'RU', name: 'The Russian Federation' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PL', name: 'Poland' },
  { code: 'TR', name: 'Türkiye' },
] as const;

export const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'USA', GB: 'UK', DE: 'Germany', FR: 'France', ES: 'Spain',
  IT: 'Italy', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', JP: 'Japan',
  KR: 'Korea', IN: 'India', AU: 'Australia', CA: 'Canada', NL: 'Netherlands',
  PT: 'Portugal', SE: 'Sweden', RU: 'Russia', CO: 'Colombia', CL: 'Chile',
  PL: 'Poland', TR: 'Türkiye',
};
