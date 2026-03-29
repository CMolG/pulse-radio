/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * Zod schemas for cached API responses (ARCH-073).
 *
 * These validate data read from the SQLite cache tier to detect schema drift
 * when upstream APIs change their response format between deployments.
 *
 * Every object schema uses `.passthrough()` so newly added fields from
 * upstream APIs are preserved without triggering validation failures.
 */
import { z } from 'zod';

// ── iTunes Search / Lookup ──────────────────────────────────────────────────

export const ItunesSearchResultSchema = z
  .object({
    resultCount: z.number(),
    results: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

// ── Artist Info (MusicBrainz + Wikipedia aggregated) ────────────────────────

export const ArtistInfoSchema = z
  .object({
    name: z.string(),
    disambiguation: z.string().nullable(),
    type: z.string().nullable(),
    country: z.string().nullable(),
    beginArea: z.string().nullable(),
    lifeSpan: z.record(z.string(), z.unknown()).nullable(),
    tags: z.array(z.string()),
    bio: z.string().nullable(),
    imageUrl: z.string().nullable(),
    wikipediaUrl: z.string().nullable(),
  })
  .passthrough();

// ── Concert Events (Bandsintown) ────────────────────────────────────────────

export const ConcertEventSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    venue: z.string(),
    city: z.string(),
    country: z.string(),
    lineup: z.array(z.string()),
    ticketUrl: z.string().nullable(),
  })
  .passthrough();

export const ConcertEventsSchema = z.array(ConcertEventSchema);

// ── Lyrics (LrcLib) ────────────────────────────────────────────────────────

export const LyricsResponseSchema = z
  .object({
    syncedLyrics: z.string().nullable().optional(),
    plainLyrics: z.string().nullable().optional(),
    trackName: z.string().optional(),
    artistName: z.string().optional(),
    albumName: z.string().optional(),
    duration: z.number().optional(),
    id: z.number().optional(),
  })
  .passthrough();
