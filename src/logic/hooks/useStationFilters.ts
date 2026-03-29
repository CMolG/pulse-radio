/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Station } from '@/components/radio/constants';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';

const STORAGE_KEY = 'radio-station-filters';

export interface StationFilters {
  minBitrate: number | null;
  codecs: string[];
  languages: string[];
  tags: string[];
}

const DEFAULT_FILTERS: StationFilters = {
  minBitrate: null,
  codecs: [],
  languages: [],
  tags: [],
};

function applyFiltersToStations(stations: Station[], filters: StationFilters): Station[] {
  return stations.filter((s) => {
    if (filters.minBitrate !== null && s.bitrate < filters.minBitrate) return false;
    if (
      filters.codecs.length > 0 &&
      !filters.codecs.some((c) => s.codec.toLowerCase() === c.toLowerCase())
    )
      return false;
    if (filters.languages.length > 0 && s.language) {
      const sLangs = s.language.toLowerCase().split(',').map((l) => l.trim());
      if (!filters.languages.some((fl) => sLangs.includes(fl.toLowerCase()))) return false;
    } else if (filters.languages.length > 0 && !s.language) {
      return false;
    }
    if (filters.tags.length > 0) {
      const sTags = s.tags.toLowerCase().split(',').map((t) => t.trim());
      if (!filters.tags.some((ft) => sTags.includes(ft.toLowerCase()))) return false;
    }
    return true;
  });
}

export function useStationFilters() {
  const [filters, setFilters] = useState<StationFilters>(
    () => loadFromStorage<StationFilters>(STORAGE_KEY, DEFAULT_FILTERS),
  );

  const setFilter = useCallback(
    <K extends keyof StationFilters>(key: K, value: StationFilters[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        saveToStorage(STORAGE_KEY, next);
        return next;
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    saveToStorage(STORAGE_KEY, DEFAULT_FILTERS);
  }, []);

  const applyFilters = useCallback(
    (stations: Station[]) => applyFiltersToStations(stations, filters),
    [filters],
  );

  const hasActiveFilters = useMemo(
    () =>
      filters.minBitrate !== null ||
      filters.codecs.length > 0 ||
      filters.languages.length > 0 ||
      filters.tags.length > 0,
    [filters],
  );

  return { filters, setFilter, resetFilters, applyFilters, hasActiveFilters };
}

/** Extract unique filter values from a station array */
export function extractFilterOptions(stations: Station[]) {
  const codecs = new Set<string>();
  const languages = new Set<string>();
  const tags = new Set<string>();
  const bitrates: number[] = [];

  for (const s of stations) {
    if (s.codec) codecs.add(s.codec.toUpperCase());
    if (s.language) {
      for (const l of s.language.split(',')) {
        const trimmed = l.trim().toLowerCase();
        if (trimmed) languages.add(trimmed);
      }
    }
    if (s.tags) {
      for (const t of s.tags.split(',')) {
        const trimmed = t.trim().toLowerCase();
        if (trimmed) tags.add(trimmed);
      }
    }
    if (s.bitrate > 0) bitrates.push(s.bitrate);
  }

  return {
    codecs: [...codecs].sort(),
    languages: [...languages].sort(),
    tags: [...tags].sort(),
    bitrateRange: bitrates.length
      ? { min: Math.min(...bitrates), max: Math.max(...bitrates) }
      : null,
  };
}
