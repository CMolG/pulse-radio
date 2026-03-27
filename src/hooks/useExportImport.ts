/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useCallback } from 'react';

const STORAGE_KEYS = [
  'radio-favorites',
  'radio-favorite-songs',
  'radio-history',
  'radio-recent',
  'radio-volume',
  'radio-locale',
  'radio-eq-bands',
  'radio-eq-preset-name',
  'radio-custom-eq-presets',
  'radio-effects-enabled',
  'radio-bass-enhance',
  'radio-compressor-enabled',
  'radio-compressor-amount',
  'radio-noise-reduction-mode',
  'radio-normalizer-enabled',
  'radio-stereo-width',
  'radio-realtime-lyrics-enabled',
  'radio-usage-stats',
  'radio-station-queue',
  'radio-onboarding-done',
  'pulse-sleep-timer',
  'pulse-wake-timer',
  'pulse-radio-playback',
] as const;

const APP_ID = 'pulse-radio';
const SCHEMA_VERSION = 1;

interface ExportSchema {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

export type ImportMode = 'replace' | 'merge';

interface ImportResult {
  imported: number;
  skipped: number;
}

function isValidExport(obj: unknown): obj is ExportSchema {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return o.app === APP_ID && typeof o.version === 'number' && typeof o.data === 'object' && o.data !== null;
}

function mergeArrays(existing: unknown[], incoming: unknown[], keyProp?: string): unknown[] {
  if (!keyProp) {
    const set = new Set(existing.map((e) => JSON.stringify(e)));
    return [...existing, ...incoming.filter((i) => !set.has(JSON.stringify(i)))];
  }
  const seen = new Set(existing.map((e) => (e as Record<string, unknown>)?.[keyProp]));
  return [...existing, ...incoming.filter((i) => !seen.has((i as Record<string, unknown>)?.[keyProp]))];
}

function getDeduplicationKey(storageKey: string): string | undefined {
  if (storageKey === 'radio-favorites') return 'stationuuid';
  if (storageKey === 'radio-favorite-songs') return undefined; // JSON dedup
  if (storageKey === 'radio-history' || storageKey === 'radio-recent') return 'stationuuid';
  return undefined;
}

export function useExportImport() {
  const exportData = useCallback(() => {
    const data: Record<string, unknown> = {};
    for (const key of STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      } catch {
        // Skip inaccessible keys
      }
    }

    const payload: ExportSchema = {
      app: APP_ID,
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-radio-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback(
    async (file: File, mode: ImportMode = 'replace'): Promise<ImportResult> => {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file');
      }

      if (!isValidExport(parsed)) {
        throw new Error('Not a valid Pulse Radio backup file');
      }

      let imported = 0;
      let skipped = 0;

      for (const [key, value] of Object.entries(parsed.data)) {
        if (!STORAGE_KEYS.includes(key as (typeof STORAGE_KEYS)[number])) {
          skipped++;
          continue;
        }

        try {
          if (mode === 'merge' && Array.isArray(value)) {
            const existingRaw = localStorage.getItem(key);
            if (existingRaw) {
              try {
                const existing = JSON.parse(existingRaw);
                if (Array.isArray(existing)) {
                  const dedupKey = getDeduplicationKey(key);
                  const merged = mergeArrays(existing, value, dedupKey);
                  localStorage.setItem(key, JSON.stringify(merged));
                  imported++;
                  continue;
                }
              } catch {
                // Fall through to replace
              }
            }
          }

          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, serialized);
          imported++;
        } catch {
          skipped++;
        }
      }

      return { imported, skipped };
    },
    [],
  );

  return { exportData, importData };
}
