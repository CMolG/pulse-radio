/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import fs from 'node:fs';
import path from 'node:path';

/* ── Types ────────────────────────────────────────────────────────── */

export interface StationSnapshot {
  stationuuid: string;
  name: string;
  slug: string;
  routeKey: string;
  url_resolved: string;
  countrycode: string;
  country: string;
  tags: string;
  codec: string;
  bitrate: number;
  language: string;
  homepage: string;
  favicon: string;
  votes: number;
}

export interface StationRoute {
  countryCode: string;
  stationRef: string;
  stationuuid: string;
}

/* ── Paths ────────────────────────────────────────────────────────── */

const DATA_DIR = path.join(process.cwd(), '.data', 'stations');
const ROUTES_PATH = path.join(DATA_DIR, 'routes.json');
const STATIONS_PATH = path.join(DATA_DIR, 'stations.jsonl');

/* ── Slug utility ─────────────────────────────────────────────────── */

export function generateStationSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'station'
  );
}

/* ── Readers ──────────────────────────────────────────────────────── */

let _routesCache: StationRoute[] | null = null;

export function readStationRoutes(): StationRoute[] {
  if (_routesCache) return _routesCache;
  try {
    const raw = fs.readFileSync(ROUTES_PATH, 'utf-8');
    _routesCache = JSON.parse(raw) as StationRoute[];
    return _routesCache;
  } catch {
    return [];
  }
}

let _stationsIndex: Map<string, StationSnapshot> | null = null;

function ensureStationsIndex(): Map<string, StationSnapshot> {
  if (_stationsIndex) return _stationsIndex;
  _stationsIndex = new Map();
  try {
    const content = fs.readFileSync(STATIONS_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      const station = JSON.parse(line) as StationSnapshot;
      _stationsIndex.set(station.routeKey, station);
    }
  } catch {
    /* snapshot not yet generated – return empty map */
  }
  return _stationsIndex;
}

export function readStationByRef(stationRef: string): StationSnapshot | null {
  return ensureStationsIndex().get(stationRef) ?? null;
}

export function readStationsByCountry(countryCode: string): StationSnapshot[] {
  const code = countryCode.toUpperCase();
  const results: StationSnapshot[] = [];
  for (const station of ensureStationsIndex().values()) {
    if (station.countrycode === code) results.push(station);
  }
  return results;
}
