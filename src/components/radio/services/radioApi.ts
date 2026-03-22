/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import type { Station } from '../types';

const BASE = 'https://de1.api.radio-browser.info/json';
const cache = new Map<string, { data: Station[]; ts: number }>();
const TTL = 60_000;
const MAX_CACHE = 100;

async function fetchCached(url: string, key: string): Promise<Station[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) {
    cache.delete(key);
    cache.set(key, hit);
    return hit.data;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    await res.text().catch(() => {}); // drain body to release connection
    throw new Error(`Radio API ${res.status}`);
  }
  const data: Station[] = await res.json();
  const filtered = data.filter(s => s.url_resolved);
  cache.set(key, { data: filtered, ts: Date.now() });
  if (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return filtered;
}

export async function topStations(limit = 20): Promise<Station[]> {
  return fetchCached(`${BASE}/stations/topvote?limit=${limit}`, `top-${limit}`);
}

export async function searchStations(query: string, limit = 30): Promise<Station[]> {
  const params = new URLSearchParams({
    name: query,
    limit: String(limit),
    order: 'votes',
    reverse: 'true',
  });
  return fetchCached(`${BASE}/stations/search?${params}`, `search:${query}`);
}

export async function stationsByTag(tag: string, limit = 30): Promise<Station[]> {
  const params = new URLSearchParams({
    tag: tag.toLowerCase(),
    limit: String(limit),
    order: 'votes',
    reverse: 'true',
  });
  return fetchCached(`${BASE}/stations/search?${params}`, `tag:${tag}`);
}

export async function stationsByCountry(country: string, limit = 30): Promise<Station[]> {
  const params = new URLSearchParams({
    country: country,
    limit: String(limit),
    order: 'votes',
    reverse: 'true',
  });
  return fetchCached(`${BASE}/stations/search?${params}`, `country:${country}`);
}

export async function trendingStations(limit = 20): Promise<Station[]> {
  return fetchCached(
    `${BASE}/stations/topvote?limit=${limit}&order=votes&reverse=true`,
    `trending-${limit}`,
  );
}

export async function localStations(limit = 20): Promise<Station[]> {
  const countryCode =
    typeof navigator !== 'undefined'
      ? navigator.language?.split('-')[1]?.toUpperCase() || ''
      : '';
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return topStations(limit);
  return fetchCached(
    `${BASE}/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${limit}&order=votes&reverse=true`,
    `local-${countryCode}-${limit}`,
  );
}
