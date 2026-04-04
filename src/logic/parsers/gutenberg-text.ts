/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

/**
 * Text parser for Project Gutenberg plain-text files.
 * Strips header/footer, detects chapters, paginates into pages.
 */

import type { BookContentPage } from '@/logic/gutenberg-api';

const START_MARKER = '*** START OF THE PROJECT GUTENBERG EBOOK';
const END_MARKER = '*** END OF THE PROJECT GUTENBERG EBOOK';

const CHAPTER_RE =
  /^(?:CHAPTER|Chapter|BOOK|Book|PART|Part|ACT|Act|SECTION|Section|CANTO|Canto)\s+[\dIVXLCDMivxlcdm]+/;

const DEFAULT_PAGE_SIZE = 2000;

/** Strip Gutenberg header and footer boilerplate. */
function stripBoilerplate(text: string): string {
  let start = 0;
  let end = text.length;

  const startIdx = text.indexOf(START_MARKER);
  if (startIdx !== -1) {
    const afterMarker = text.indexOf('\n', startIdx);
    start = afterMarker !== -1 ? afterMarker + 1 : startIdx + START_MARKER.length;
  }

  const endIdx = text.indexOf(END_MARKER, start);
  if (endIdx !== -1) {
    end = endIdx;
  }

  return text.slice(start, end).trim();
}

/** Detect chapter label if the line is a chapter heading. */
function detectChapter(line: string): string | null {
  const trimmed = line.trim();
  if (CHAPTER_RE.test(trimmed)) return trimmed;
  return null;
}

/** Count words in a string. */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Parse a raw Gutenberg plain-text string into paginated pages.
 * Each page is roughly `pageSize` characters, breaking at paragraph boundaries.
 */
export function parseGutenbergText(
  raw: string,
  pageSize: number = DEFAULT_PAGE_SIZE,
): BookContentPage[] {
  const body = stripBoilerplate(raw);
  if (!body) return [];

  const paragraphs = body.split(/\n\s*\n/);
  const pages: BookContentPage[] = [];
  let currentText = '';
  let currentChapter: string | null = null;
  let pageIndex = 0;

  function flushPage(): void {
    const text = currentText.trim();
    if (!text) return;
    pages.push({
      index: pageIndex++,
      text,
      chapterLabel: currentChapter,
      wordCount: countWords(text),
    });
    currentText = '';
  }

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check first line for chapter heading
    const firstLine = trimmed.split('\n')[0];
    const chapter = detectChapter(firstLine);
    if (chapter) {
      // Flush current page before starting a new chapter
      if (currentText.trim()) flushPage();
      currentChapter = chapter;
    }

    if (currentText.length + trimmed.length + 2 > pageSize && currentText.trim()) {
      flushPage();
    }

    currentText += (currentText ? '\n\n' : '') + trimmed;
  }

  // Flush remaining text
  if (currentText.trim()) flushPage();

  return pages;
}
