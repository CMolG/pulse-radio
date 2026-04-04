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

export const gutenbergBooksSchema = z.object({
  search: z.string().max(200).optional(),
  topic: z.string().max(200).optional(),
  language: z.string().max(10).optional(),
  page: z.coerce.number().int().min(1).max(100).optional(),
});

export const gutenbergBookContentSchema = z.object({
  format: z.enum(['text', 'html']).optional(),
  pageSize: z.coerce.number().int().min(500).max(5000).optional(),
});

export const librivoxAudiobooksSchema = z.object({
  title: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  genre: z.string().max(100).optional(),
  id: z.string().max(20).optional(),
  since: z.string().max(30).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const librivoxAudiotracksSchema = z.object({
  project_id: z.string().min(1).max(20),
});
