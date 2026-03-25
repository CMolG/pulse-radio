/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/** Format milliseconds to mm:ss */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00'; const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${minutes}:${seconds.toString().padStart(2, '0')}`; }
/** Format an ISO date string to a readable year */
export function formatReleaseDate(isoDate: string): string { return isoDate.slice(0, 4); }
