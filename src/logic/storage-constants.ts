/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

export const STORAGE_KEYS = {
  FAVORITES: 'radio-favorites',
  RECENT: 'radio-recent',
  VOLUME: 'radio-volume',
  EQ_BANDS: 'radio-eq-bands',
  LYRICS_CACHE: 'radio-lyrics-cache',
  CUSTOM_EQ_PRESETS: 'radio-custom-eq-presets',
  HISTORY: 'radio-history',
  FAVORITE_SONGS: 'radio-favorite-songs',
  NORMALIZER_ENABLED: 'radio-normalizer-enabled',
  STEREO_WIDTH: 'radio-stereo-width',
  BASS_ENHANCE: 'radio-bass-enhance',
  COMPRESSOR_ENABLED: 'radio-compressor-enabled',
  COMPRESSOR_AMOUNT: 'radio-compressor-amount',
  NOISE_REDUCTION_MODE: 'radio-noise-reduction-mode',
  REALTIME_LYRICS_ENABLED: 'radio-realtime-lyrics-enabled',
  LOCALE: 'radio-locale',
  USAGE_STATS: 'radio-usage-stats',
  ONBOARDING_DONE: 'radio-onboarding-done',
  EFFECTS_ENABLED: 'radio-effects-enabled',
  EQ_PRESET_NAME: 'radio-eq-preset-name',
  QUALITY_MIGRATION: 'radio-quality-migration',
  STATION_QUEUE: 'radio-station-queue',
  AUDIOBOOK_RECENTS: 'radio-audiobook-recents',
  PIP_ENABLED: 'radio-pip-enabled',
  BOOK_RECENTS: 'radio-book-recents',
  BOOK_PROGRESS: 'radio-book-progress',
  BOOK_READER_PREFS: 'radio-book-reader-prefs',
} as const;

export const MAX_RECENT = 15;
export const MAX_HISTORY = 100;
