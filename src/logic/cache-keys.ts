/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * Shared cache-key normalisation & builders.
 * Every API route that stores/reads from the cache must use these helpers
 * so key formats stay consistent and diacritics are handled uniformly.
 */

/** Strip diacritics, special characters, collapse whitespace, lowercase. */
export function normalizeCacheKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function lyricsKey(artist: string, title: string): string {
  return `${normalizeCacheKey(artist)}|${normalizeCacheKey(title)}`;
}

export function concertsKey(artist: string): string {
  return normalizeCacheKey(artist);
}

export function artistInfoKey(artist: string): string {
  return artist.toLowerCase().trim();
}

export function itunesKey(term: string, media: string): string {
  return `${media}:${term.toLowerCase().trim()}`;
}

export function gutenbergBooksKey(params: Record<string, string | undefined>): string {
  const parts = ['search', 'topic', 'language', 'page']
    .map((k) => (params[k] ? `${k}:${normalizeCacheKey(params[k]!)}` : ''))
    .filter(Boolean);
  return parts.join('|') || 'popular';
}

export function gutenbergBookKey(id: string): string {
  return `book:${id}`;
}

export function gutenbergContentKey(id: string, format: string, pageSize: number): string {
  return `content:${id}:${format}:${pageSize}`;
}

export function librivoxAudiobooksKey(params: Record<string, string | undefined>): string {
  const parts = ['title', 'author', 'genre', 'id', 'since', 'limit', 'offset']
    .map((k) => (params[k] ? `${k}:${normalizeCacheKey(params[k]!)}` : ''))
    .filter(Boolean);
  return parts.join('|') || 'all';
}

export function librivoxAudiotracksKey(projectId: string): string {
  return `tracks:${projectId}`;
}
