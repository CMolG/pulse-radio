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

export const stationHealth = sqliteTable('station_health', {
  url: text('url').primaryKey(),
  successCount: integer('success_count', { mode: 'number' }).notNull().default(0),
  failureCount: integer('failure_count', { mode: 'number' }).notNull().default(0),
  lastSuccess: integer('last_success', { mode: 'number' }),
  lastFailure: integer('last_failure', { mode: 'number' }),
  avgResponseMs: integer('avg_response_ms', { mode: 'number' }),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const userData = sqliteTable('user_data', {
  userId: text('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

export const analyticsEvents = sqliteTable('analytics_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  event: text('event').notNull(),
  properties: text('properties').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const nowPlaying = sqliteTable('now_playing', {
  stationUuid: text('station_uuid').primaryKey(),
  stationName: text('station_name').notNull(),
  streamTitle: text('stream_title').notNull(),
  detectedAt: integer('detected_at', { mode: 'number' }).notNull(),
  country: text('country'),
  genre: text('genre'),
});

export const stationPlays = sqliteTable('station_plays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stationUuid: text('station_uuid').notNull(),
  stationName: text('station_name').notNull(),
  stationUrl: text('station_url').notNull(),
  stationFavicon: text('station_favicon'),
  stationCountry: text('station_country'),
  stationCountrycode: text('station_countrycode'),
  stationTags: text('station_tags'),
  stationCodec: text('station_codec'),
  stationBitrate: integer('station_bitrate', { mode: 'number' }),
  playedAt: integer('played_at', { mode: 'number' }).notNull(),
});
