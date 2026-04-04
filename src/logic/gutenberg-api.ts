/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * Gutenberg API types and normalizer for the Gutendex REST API.
 * https://gutendex.com/
 */

export interface BookItem {
  id: string;
  title: string;
  authors: string[];
  subjects: string[];
  languages: string[];
  coverUrl: string | null;
  downloadCount: number;
  readableTextUrl: string | null;
  readableHtmlUrl: string | null;
  gutenbergUrl: string;
}

export interface BookContentPage {
  index: number;
  text: string;
  chapterLabel: string | null;
  wordCount: number;
}

export interface BookContentPayload {
  book: BookItem;
  pages: BookContentPage[];
  totalPages: number;
  estimatedReadMinutes: number;
}

/* ── Raw Gutendex types ──────────────────────────────────────────── */

interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  languages: string[];
  formats: Record<string, string>;
  download_count: number;
}

export interface GutendexSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

/* ── Normalizer ──────────────────────────────────────────────────── */

function pickFormat(formats: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    if (formats[k]) return formats[k];
  }
  return null;
}

export function normalizeBook(raw: GutendexBook): BookItem {
  return {
    id: String(raw.id),
    title: raw.title,
    authors: raw.authors.map((a) => a.name),
    subjects: raw.subjects,
    languages: raw.languages,
    coverUrl: pickFormat(raw.formats, 'image/jpeg'),
    downloadCount: raw.download_count,
    readableTextUrl: pickFormat(raw.formats, 'text/plain; charset=utf-8', 'text/plain'),
    readableHtmlUrl: pickFormat(raw.formats, 'text/html', 'text/html; charset=utf-8'),
    gutenbergUrl: `https://www.gutenberg.org/ebooks/${raw.id}`,
  };
}

export function normalizeSearchResult(raw: GutendexSearchResult): {
  books: BookItem[];
  count: number;
  hasMore: boolean;
} {
  return {
    books: raw.results.map(normalizeBook),
    count: raw.count,
    hasMore: raw.next !== null,
  };
}
