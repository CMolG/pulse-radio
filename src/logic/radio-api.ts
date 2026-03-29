/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { Station } from '@/components/radio/constants';

const _NOOP = () => {};

const SERVERS = [
  'https://de1.api.radio-browser.info/json',
  'https://de2.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
];
let serverIndex = 0;
function getBase(): string {
  return SERVERS[serverIndex % SERVERS.length];
}
function rotateServer(): void {
  serverIndex = (serverIndex + 1) % SERVERS.length;
}
const radioApiCache = new Map<string, { data: Station[]; ts: number }>();
const TTL = 60_000;
const RADIO_API_MAX_CACHE = 100;
async function fetchCached(path: string, key: string): Promise<Station[]> {
  const hit = radioApiCache.get(key);
  if (hit && Date.now() - hit.ts < TTL) {
    radioApiCache.delete(key);
    radioApiCache.set(key, hit);
    return hit.data;
  }
  for (let attempt = 0; attempt < SERVERS.length; attempt++) {
    try {
      const url = `${getBase()}${path}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        await res.text().catch(_NOOP);
        rotateServer();
        continue;
      }
      const data: Station[] = await res.json();
      const filtered = data.filter((s) => s.url_resolved);
      radioApiCache.set(key, { data: filtered, ts: Date.now() });
      while (radioApiCache.size > RADIO_API_MAX_CACHE) {
        const oldest = radioApiCache.keys().next().value;
        if (oldest !== undefined) radioApiCache.delete(oldest);
        else break;
      }
      return filtered;
    } catch {
      rotateServer();
    }
  }
  throw new Error('All Radio-Browser API servers unavailable');
}
export async function fetchStationByUuid(uuid: string): Promise<Station | null> {
  for (let attempt = 0; attempt < SERVERS.length; attempt++) {
    try {
      const url = `${getBase()}/stations/byuuid/${encodeURIComponent(uuid)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        rotateServer();
        continue;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data[0] as Station;
      return null;
    } catch {
      rotateServer();
    }
  }
  return null;
}
export async function topStations(limit = 20): Promise<Station[]> {
  return fetchCached(`/stations/topvote?limit=${limit}`, `top-${limit}`);
}
function searchBy(
  filter: Record<string, string>,
  cacheKey: string,
  limit: number,
): Promise<Station[]> {
  const params = new URLSearchParams({
    ...filter,
    limit: `${limit}`,
    order: 'votes',
    reverse: 'true',
  });
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
export function trendingStations(limit = 20): Promise<Station[]> {
  return topStations(limit);
}
export async function localStations(limit = 20): Promise<Station[]> {
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  const di = lang ? lang.indexOf('-') : -1;
  const countryCode = di > 0 ? lang.slice(di + 1).toUpperCase() : '';
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return topStations(limit);
  return fetchCached(
    `/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${limit}&order=votes&reverse=true`,
    `local-${countryCode}-${limit}`,
  );
}
export async function similarStations(station: Station, limit = 5): Promise<Station[]> {
  let firstTag: string | undefined;
  if (station.tags) {
    for (const raw of station.tags.split(',')) {
      const trimmed = raw.trim();
      if (trimmed) {
        firstTag = trimmed;
        break;
      }
    }
  }
  if (!firstTag) return topStations(limit);
  const results = await stationsByTag(firstTag, limit + 5);
  return results
    .filter((s) => s.stationuuid !== station.stationuuid && s.url_resolved)
    .slice(0, limit);
}
