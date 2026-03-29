/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { create } from 'zustand';

export type ApiLogEntry = {
  id: number;
  ts: number;
  kind: 'request' | 'response' | 'error';
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  requestPreview?: string;
  responsePreview?: string;
  requestFull?: string;
  responseFull?: string;
  error?: string;
};
export type ApiLogStore = {
  entries: ApiLogEntry[];
  push: (e: Omit<ApiLogEntry, 'id'>) => void;
  clear: () => void;
};
let _apiLogId = 0;
const _DEV_API_PATTERNS = [
  '/api/icy-meta',
  '/api/itunes',
  '/api/lyrics',
  '/api/concerts',
  '/api/artist-info',
  'lrclib.net',
];
const _DEV_API_NOISE_QUERY_KEYS = new Set(['_ts', 'ts', 't', '_']);
function normalizeDevApiUrl(rawUrl: string): string {
  try {
    const parsed = new URL(
      rawUrl,
      typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
    );
    const stableParams = new URLSearchParams();
    const sorted = [...parsed.searchParams.entries()]
      .filter(([key]) => !_DEV_API_NOISE_QUERY_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b));
    for (const [key, value] of sorted) stableParams.append(key, value);
    const qs = stableParams.toString();
    const sameOrigin = typeof window !== 'undefined' && parsed.origin === window.location.origin;
    const prefix = sameOrigin ? '' : parsed.origin;
    return `${prefix}${parsed.pathname}${qs ? `?${qs}` : ''}`;
  } catch {
    return rawUrl;
  }
}
function isTrackedDevApiUrl(rawUrl: string): boolean {
  const normalized = normalizeDevApiUrl(rawUrl);
  return _DEV_API_PATTERNS.some((p) => rawUrl.includes(p) || normalized.includes(p));
}
function isIcyMetaUrl(url: string): boolean {
  return url.includes('/api/icy-meta');
}
function buildIcyDedupeKey(entry: Omit<ApiLogEntry, 'id'>): string {
  const url = normalizeDevApiUrl(entry.url);
  const method = entry.method.toUpperCase();
  if (entry.kind === 'request')
    return `${entry.kind}|${method}|${url}|${entry.requestPreview ?? ''}`;
  if (entry.kind === 'response')
    return `${entry.kind}|${method}|${url}|${entry.status ?? ''}|${entry.responsePreview ?? ''}`;
  return `${entry.kind}|${method}|${url}|${entry.status ?? ''}|${entry.error ?? ''}`;
}
export const useApiLogStore = create<ApiLogStore>((set) => ({
  entries: [],
  push: (e) =>
    set((s) => {
      if (isIcyMetaUrl(e.url)) {
        const lastIcy = [...s.entries]
          .reverse()
          .find((entry) => isIcyMetaUrl(entry.url) && entry.kind === e.kind);
        if (lastIcy && buildIcyDedupeKey(lastIcy) === buildIcyDedupeKey(e)) return s;
      }
      return {
        entries: [...s.entries.slice(-149), { ...e, id: ++_apiLogId }],
      };
    }),
  clear: () => set({ entries: [] }),
}));
let _devFetchPatched = false;
export function installDevFetchLogger() {
  if (_devFetchPatched || typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;
  _devFetchPatched = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async function devFetch(input: RequestInfo | URL, init?: RequestInit) {
    const rawUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = normalizeDevApiUrl(rawUrl);
    const matches = isTrackedDevApiUrl(rawUrl);
    if (!matches) return origFetch(input, init);
    const method = (
      init?.method ??
      (typeof Request !== 'undefined' && input instanceof Request ? input.method : undefined) ??
      'GET'
    ).toUpperCase();
    const requestPreview = init?.body
      ? String(init.body).slice(0, 200)
      : url.length > 240
        ? `${url.slice(0, 240)}…`
        : url;
    const requestFull = init?.body ? String(init.body) : url;
    useApiLogStore.getState().push({
      ts: Date.now(),
      kind: 'request',
      method,
      url,
      requestPreview,
      requestFull,
    });
    const t0 = performance.now();
    try {
      const res = await origFetch(input, init);
      const durationMs = Math.round(performance.now() - t0);
      let responsePreview = '';
      let responseFull = '';
      try {
        const clone = res.clone();
        const text = await clone.text();
        responseFull = text;
        responsePreview = text.length > 200 ? text.slice(0, 200) + '…' : text;
      } catch {
        /* ignore */
      }
      useApiLogStore.getState().push({
        ts: Date.now(),
        kind: 'response',
        method,
        url,
        status: res.status,
        durationMs,
        responsePreview,
        responseFull,
      });
      return res;
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      useApiLogStore.getState().push({
        ts: Date.now(),
        kind: 'error',
        method,
        url,
        durationMs,
        error: String(err),
      });
      throw err;
    }
  } as typeof window.fetch;
}
