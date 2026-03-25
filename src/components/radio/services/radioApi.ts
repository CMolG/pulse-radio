/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
import type { Station } from '../types';
// Radio-Browser API mirrors for redundancy
const SERVERS = [ 'https://de1.api.radio-browser.info/json', 'https://de2.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
];
let serverIndex = 0;
function getBase(): string { return SERVERS[serverIndex % SERVERS.length]; }
function rotateServer(): void { serverIndex = (serverIndex + 1) % SERVERS.length; }
const cache = new Map<string, { data: Station[]; ts: number }>();
const TTL = 60_000;
const MAX_CACHE = 100;
async function fetchCached(path: string, key: string): Promise<Station[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) {
    cache.delete(key); cache.set(key, hit); return hit.data;
  }
  // Try current server, failover to next on error
  for (let attempt = 0; attempt < SERVERS.length; attempt++) {
    try {
      const url = `${getBase()}${path}`; const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        await res.text().catch(() => {}); rotateServer(); continue;
      }
      const data: Station[] = await res.json(); const filtered = data.filter(s => s.url_resolved);
      cache.set(key, { data: filtered, ts: Date.now() });
      while (cache.size > MAX_CACHE) {
        const oldest = cache.keys().next().value; if (oldest !== undefined) cache.delete(oldest); else break;
      }
      return filtered;
    } catch { rotateServer(); }
  }
  throw new Error('All Radio-Browser API servers unavailable');
}
export async function topStations(limit = 20): Promise<Station[]> {
  return fetchCached(`/stations/topvote?limit=${limit}`, `top-${limit}`);
}
function searchBy(filter: Record<string, string>, cacheKey: string, limit: number): Promise<Station[]> {
  const params = new URLSearchParams({ ...filter, limit: String(limit), order: 'votes', reverse: 'true' });
  return fetchCached(`/stations/search?${params}`, cacheKey);
}
export function searchStations(query: string, limit = 30): Promise<Station[]> {
  return searchBy({ name: query }, `search:${query}`, limit);
}
export function stationsByTag(tag: string, limit = 30): Promise<Station[]> {
  return searchBy({ tag: tag.toLowerCase() }, `tag:${tag}`, limit);
}
export function stationsByCountry(country: string, limit = 30): Promise<Station[]> {
  return searchBy({ country }, `country:${country}`, limit);
}
export function trendingStations(limit = 20): Promise<Station[]> { return topStations(limit); }
export async function localStations(limit = 20): Promise<Station[]> {
  const countryCode = typeof navigator !== 'undefined' ? navigator.language?.split('-')[1]?.toUpperCase() || '' : '';
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return topStations(limit);
  return fetchCached(
    `/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${limit}&order=votes&reverse=true`,
    `local-${countryCode}-${limit}`,
  );
}
/**
 * Find similar stations by matching the first tag of the current station.
 * Used for automatic failover when the current station goes down.
 */
export async function similarStations(station: Station, limit = 5): Promise<Station[]> {
  const firstTag = station.tags?.split(',').map(t => t.trim()).filter(Boolean)[0];
  if (!firstTag) return topStations(limit); const results = await stationsByTag(firstTag, limit + 5);
  // Exclude the current station and filter to only online streams
  return results .filter(s => s.stationuuid !== station.stationuuid && s.url_resolved).slice(0, limit);
}
