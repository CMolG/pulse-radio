/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * LibriVox API types and normalizer functions.
 * Converts raw LibriVox JSON responses into typed AudiobookItem / AudiobookTrack objects.
 */

export interface AudiobookItem {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  language: string | null;
  genreLabels: string[];
  durationSecs: number | null;
  coverUrl: string | null;
  librivoxUrl: string;
  rssUrl: string | null;
  zipUrl: string | null;
}

export interface AudiobookTrack {
  id: string;
  bookId: string;
  title: string;
  listenUrl: string;
  durationSecs: number | null;
  sectionNumber: number | null;
}

// ---------------------------------------------------------------------------
// Raw LibriVox response shapes (internal — not exported)
// ---------------------------------------------------------------------------

interface RawAuthor {
  id?: string;
  first_name?: string;
  last_name?: string;
}

interface RawBook {
  id?: string | number;
  title?: string;
  description?: string;
  language?: string;
  authors?: RawAuthor[] | null;
  genres?: Array<{ id?: string; name?: string }> | null;
  totaltime?: string;
  totaltimesecs?: string | number;
  url_librivox?: string;
  url_rss?: string;
  url_zip_file?: string;
  url_text_source?: string;
}

interface RawSection {
  id?: string | number;
  section_number?: string | number;
  title?: string;
  listen_url?: string;
  playtime?: string;
  project_id?: string | number;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function parseDuration(raw: string | number | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function authorName(a: RawAuthor): string {
  const parts = [a.first_name, a.last_name].filter(Boolean);
  return parts.join(' ') || 'Unknown';
}

function coverUrlFromId(id: string): string {
  return `https://archive.org/services/img/librivox_cd_covers_${id}`;
}

export function normalizeBook(raw: RawBook): AudiobookItem {
  const id = String(raw.id ?? '');
  return {
    id,
    title: raw.title?.trim() || 'Untitled',
    authors: Array.isArray(raw.authors) ? raw.authors.map(authorName) : [],
    description: raw.description?.trim() || null,
    language: raw.language?.trim() || null,
    genreLabels: Array.isArray(raw.genres)
      ? raw.genres.map((g) => g.name ?? '').filter(Boolean)
      : [],
    durationSecs: parseDuration(raw.totaltimesecs),
    coverUrl: id ? coverUrlFromId(id) : null,
    librivoxUrl: raw.url_librivox?.trim() || `https://librivox.org/`,
    rssUrl: raw.url_rss?.trim() || null,
    zipUrl: raw.url_zip_file?.trim() || null,
  };
}

export function normalizeBooks(raw: unknown): AudiobookItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const books = Array.isArray(obj.books) ? obj.books : [];
  return books.map((b: unknown) => normalizeBook((b ?? {}) as RawBook));
}

export function normalizeTrack(raw: RawSection): AudiobookTrack {
  return {
    id: String(raw.id ?? ''),
    bookId: String(raw.project_id ?? ''),
    title: raw.title?.trim() || `Section ${raw.section_number ?? '?'}`,
    listenUrl: raw.listen_url?.trim() || '',
    durationSecs: parseDuration(raw.playtime),
    sectionNumber: raw.section_number != null ? Number(raw.section_number) || null : null,
  };
}

export function normalizeTracks(raw: unknown): AudiobookTrack[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const sections = Array.isArray(obj.sections) ? obj.sections : [];
  return sections.map((s: unknown) => normalizeTrack((s ?? {}) as RawSection));
}
