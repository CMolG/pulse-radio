/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { z } from 'zod';

export const itunesSchema = z.object({
  term: z.string().min(1).max(200),
  media: z.enum(['music', 'podcast']).optional(),
  entity: z.enum(['song', 'album']).optional(),
});

export const itunesLookupSchema = z.object({
  id: z.string().regex(/^\d+$/).max(15),
});

export const lyricsSchema = z.object({
  artist: z.string().min(1).max(300),
  title: z.string().min(1).max(300),
  album: z.string().max(300).optional(),
  duration: z.coerce.number().positive().optional(),
});

export const artistInfoSchema = z.object({
  artist: z.string().min(1).max(200).trim(),
});

export const concertsSchema = z.object({
  artist: z.string().min(1).max(200).trim(),
});

export const proxyStreamSchema = z.object({
  url: z.string().url().max(2048),
});

export const icyMetaSchema = z.object({
  url: z.string().url().max(2048),
});
