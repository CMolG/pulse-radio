/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * Prebuild script: fetches all stations from the Radio Browser API,
 * normalises them, and writes a snapshot to .data/stations/ for SSG.
 *
 * Usage:  npx tsx scripts/station-catalog.ts
 * Env:    STATION_SSG_MAX_PAGES – caps the number of station routes emitted.
 */

import fs from 'node:fs';
import path from 'node:path';

/* ── Types ────────────────────────────────────────────────────────── */

interface RawStation {
  stationuuid: string;
  name: string;
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

interface StationSnapshot {
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

interface StationRoute {
  countryCode: string;
  stationRef: string;
  stationuuid: string;
}

interface CatalogMeta {
  timestamp: string;
  totalStations: number;
  totalCountries: number;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function generateStationSlug(name: string): string {
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

const API_SERVERS = [
  'https://de1.api.radio-browser.info/json',
  'https://de2.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
];

async function fetchAllStations(): Promise<RawStation[]> {
  for (const base of API_SERVERS) {
    try {
      const url = `${base}/stations?limit=100000&hidebroken=true&order=votes&reverse=true`;
      console.log(`⏳  Fetching stations from ${base}…`);
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) continue;
      const data: RawStation[] = await res.json();
      console.log(`✅  Received ${data.length} stations from API.`);
      return data;
    } catch (err) {
      console.warn(`⚠️  Failed to fetch from ${base}:`, (err as Error).message);
    }
  }
  throw new Error('All Radio-Browser API servers unavailable');
}

function isValidStation(s: RawStation): boolean {
  return Boolean(s.stationuuid && s.name?.trim() && s.url_resolved && s.countrycode);
}

/* ── Main ─────────────────────────────────────────────────────────── */

async function main() {
  const maxPages = process.env.STATION_SSG_MAX_PAGES
    ? parseInt(process.env.STATION_SSG_MAX_PAGES, 10)
    : undefined;

  const raw = await fetchAllStations();
  const valid = raw.filter(isValidStation);
  console.log(`📋  ${valid.length} stations passed validation.`);

  const seenRouteKeys = new Set<string>();
  const snapshots: StationSnapshot[] = [];
  const routes: StationRoute[] = [];

  for (const s of valid) {
    const slug = generateStationSlug(s.name);
    const routeKey = `${slug}--${s.stationuuid}`;

    if (seenRouteKeys.has(routeKey)) continue;
    seenRouteKeys.add(routeKey);

    snapshots.push({
      stationuuid: s.stationuuid,
      name: s.name.trim(),
      slug,
      routeKey,
      url_resolved: s.url_resolved,
      countrycode: s.countrycode.toUpperCase(),
      country: s.country || '',
      tags: s.tags || '',
      codec: s.codec || '',
      bitrate: s.bitrate || 0,
      language: s.language || '',
      homepage: s.homepage || '',
      favicon: s.favicon || '',
      votes: s.votes || 0,
    });

    routes.push({
      countryCode: s.countrycode.toUpperCase(),
      stationRef: routeKey,
      stationuuid: s.stationuuid,
    });

    if (maxPages && routes.length >= maxPages) {
      console.log(`🛑  Reached STATION_SSG_MAX_PAGES limit (${maxPages}).`);
      break;
    }
  }

  /* ── Write output ──────────────────────────────────────────────── */
  const outDir = path.resolve(process.cwd(), '.data', 'stations');
  fs.mkdirSync(outDir, { recursive: true });

  // stations.jsonl
  const jsonlPath = path.join(outDir, 'stations.jsonl');
  const jsonlStream = fs.createWriteStream(jsonlPath);
  for (const snap of snapshots) {
    jsonlStream.write(JSON.stringify(snap) + '\n');
  }
  jsonlStream.end();

  // routes.json
  const routesPath = path.join(outDir, 'routes.json');
  fs.writeFileSync(routesPath, JSON.stringify(routes), 'utf-8');

  // meta.json
  const countries = new Set(routes.map((r) => r.countryCode));
  const meta: CatalogMeta = {
    timestamp: new Date().toISOString(),
    totalStations: routes.length,
    totalCountries: countries.size,
  };
  const metaPath = path.join(outDir, 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  console.log(`\n📦  Station catalog written to ${outDir}`);
  console.log(`    stations.jsonl : ${snapshots.length} stations`);
  console.log(`    routes.json    : ${routes.length} routes`);
  console.log(`    meta.json      : ${meta.totalCountries} countries`);
}

main().catch((err) => {
  console.error('❌  station-catalog failed:', err);
  process.exit(1);
});
