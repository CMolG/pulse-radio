/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Shared cache table factory — one table per API namespace.
 * `key`          — normalized lookup key (e.g. artist name, search term)
 * `payload`      — JSON-stringified API response (flexible, no migrations on API changes)
 * `fetchedAt`    — epoch ms when the record was last fetched from the external API
 * `ttlMs`        — how long (ms) this record is considered fresh
 */

export const itunesCache = sqliteTable('itunes_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'number' }).notNull(),
  ttlMs: integer('ttl_ms', { mode: 'number' }).notNull(),
});

export const artistInfoCache = sqliteTable('artist_info_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'number' }).notNull(),
  ttlMs: integer('ttl_ms', { mode: 'number' }).notNull(),
});

export const concertsCache = sqliteTable('concerts_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'number' }).notNull(),
  ttlMs: integer('ttl_ms', { mode: 'number' }).notNull(),
});

export const lyricsCache = sqliteTable('lyrics_cache', {
  key: text('key').primaryKey(),
  payload: text('payload').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'number' }).notNull(),
  ttlMs: integer('ttl_ms', { mode: 'number' }).notNull(),
});
