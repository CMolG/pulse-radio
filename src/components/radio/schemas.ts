/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { z } from 'zod';

export const StationSchema = z.object({
  stationuuid: z.string().min(1, 'Station UUID is required'),
  name: z.string().min(1, 'Station name is required'),
  url_resolved: z.string().url('Invalid station URL'),
  favicon: z.string().url('Invalid favicon URL').optional().default(''),
  country: z.string().optional().default(''),
  countrycode: z.string().optional().default(''),
  tags: z.string().optional().default(''),
  votes: z.number().int().min(0, 'Votes must be non-negative').optional().default(0),
  codec: z.string().optional().default(''),
  bitrate: z.number().int().min(0, 'Bitrate must be non-negative').optional().default(0),
  language: z.string().optional(),
  homepage: z.string().url('Invalid homepage URL').optional(),
}).strict();

export const TrackFieldsSchema = z.object({
  title: z.string().min(1, 'Track title is required'),
  artist: z.string().min(1, 'Artist name is required'),
  album: z.string().optional(),
  artworkUrl: z.string().url('Invalid artwork URL').optional(),
  itunesUrl: z.string().url('Invalid iTunes URL').optional(),
  durationMs: z.number().int().min(0, 'Duration must be non-negative').optional(),
  genre: z.string().optional(),
  releaseDate: z.string().optional(),
  trackNumber: z.number().int().min(0, 'Track number must be non-negative').optional(),
  trackCount: z.number().int().min(0, 'Track count must be non-negative').optional(),
}).strict();

export const NowPlayingTrackSchema = TrackFieldsSchema;

export const SongDetailDataSchema = TrackFieldsSchema.extend({
  stationName: z.string().min(1, 'Station name is required'),
});

export const HistoryEntrySchema = SongDetailDataSchema.extend({
  id: z.string().min(1, 'ID is required'),
  stationUuid: z.string().min(1, 'Station UUID is required'),
  timestamp: z.number().int().min(0, 'Timestamp must be non-negative'),
});

export const FavoriteSongSchema = HistoryEntrySchema;

export type Station = z.infer<typeof StationSchema>;
export type TrackFields = z.infer<typeof TrackFieldsSchema>;
export type NowPlayingTrack = z.infer<typeof NowPlayingTrackSchema>;
export type SongDetailData = z.infer<typeof SongDetailDataSchema>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type FavoriteSong = z.infer<typeof FavoriteSongSchema>;

/** Validate a station object safely, returning null if invalid. */
export function validateStation(data: unknown): Station | null {
  try {
    return StationSchema.parse(data);
  } catch {
    return null;
  }
}

/** Validate a track object safely, returning null if invalid. */
export function validateTrackFields(data: unknown): TrackFields | null {
  try {
    return TrackFieldsSchema.parse(data);
  } catch {
    return null;
  }
}

/** Validate a history entry safely, returning null if invalid. */
export function validateHistoryEntry(data: unknown): HistoryEntry | null {
  try {
    return HistoryEntrySchema.parse(data);
  } catch {
    return null;
  }
}

/** Validate an array of stations, filtering out invalid ones. */
export function validateStations(data: unknown[]): Station[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(validateStation)
    .filter((s): s is Station => s !== null);
}

/** Validate an array of history entries, filtering out invalid ones. */
export function validateHistoryEntries(data: unknown[]): HistoryEntry[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(validateHistoryEntry)
    .filter((h): h is HistoryEntry => h !== null);
}
