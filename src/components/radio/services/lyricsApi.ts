/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { LyricsData, LrcLibResponse } from '../types'; import { parseLrc } from '../lrcParser'; const LRCLIB_BASE = 'https://lrclib.net/api'; const FETCH_TIMEOUT_MS = 8_000; function isTransientError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true; if (err instanceof TypeError) return true; // fetch network failure
  return false; }
function fetchWithCancel(url: string, parentSignal?: AbortSignal): Promise<Response> { // Follows the child-controller pattern used by fetchIcyMeta in useStationMeta. // Fetch with combined cancellation: parent signal (caller abort) + per-request timeout.
  if (!parentSignal) return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS); const onParentAbort = () => controller.abort(); if (parentSignal.aborted) { clearTimeout(timeout); controller.abort(); return fetch(url, { signal: controller.signal }); // will reject immediately
  } parentSignal.addEventListener('abort', onParentAbort, { once: true }); return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout); parentSignal.removeEventListener('abort', onParentAbort);});
} export async function fetchLyrics( artist: string, title: string, album?: string, duration?: number, fallbackArtist?: string, signal?: AbortSignal, ): Promise<LyricsData | null> {
  const artistCandidates = [...new Set([artist, fallbackArtist].map(v => v?.trim()).filter((v): v is string => !!v),)]; if (!artistCandidates.length || !title?.trim()) return null; for (const artistCandidate of artistCandidates) { if (signal?.aborted) return null; try { const match = await fetchLyricsForArtist(artistCandidate, title, album, duration, signal); if (match) return match; } catch (err) {
      if (isTransientError(err)) throw err; } // Re-throw transient errors so useLyrics can retry
  } return null; }
async function tryFetch<T>(url: string, signal: AbortSignal | undefined, parse: (d: T) => LyricsData | null): Promise<LyricsData | null> {
  try { const res = await fetchWithCancel(url, signal); if (res.ok) return parse(await res.json()); await res.text().catch(() => {}); // drain body
  } catch (err) { if (isTransientError(err)) throw err; } return null; }
async function fetchLyricsForArtist( artist: string, title: string, album?: string, duration?: number, signal?: AbortSignal, ): Promise<LyricsData | null> { const params = new URLSearchParams({ artist_name: artist, track_name: title, }); if (album) params.set('album_name', album); if (duration) params.set('duration', String(Math.round(duration))); const exact = await tryFetch<LrcLibResponse>(`${LRCLIB_BASE}/get?${params}`, signal, d => transform(d, artist, title)); if (exact) return exact; if (signal?.aborted) return null; return tryFetch<LrcLibResponse[]>(
    `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`, signal, r => r.length > 0 ? transform(r[0], artist, title) : null,);
} function transform(data: LrcLibResponse, artist: string, title: string): LyricsData | null { if (data.syncedLyrics) {
    return { trackName: title, artistName: artist, synced: true, lines: parseLrc(data.syncedLyrics) }; }
  if (data.plainLyrics) {
    return { trackName: title, artistName: artist, synced: false, lines: [], plainText: data.plainLyrics }; }
  return null; }
