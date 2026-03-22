import type { Station } from '../types';

const BASE = 'https://de1.api.radio-browser.info/json';
const cache = new Map<string, { data: Station[]; ts: number }>();
const TTL = 60_000;

async function fetchCached(url: string, key: string): Promise<Station[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Radio API ${res.status}`);
  const data: Station[] = await res.json();
  const filtered = data.filter(s => s.url_resolved);
  cache.set(key, { data: filtered, ts: Date.now() });
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
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language?.split('-')[1] || ''
      : '';
  if (!locale) return topStations(limit);
  return fetchCached(
    `${BASE}/stations/bycountryexact/${encodeURIComponent(locale)}?limit=${limit}&order=votes&reverse=true`,
    `local-${locale}-${limit}`,
  );
}
