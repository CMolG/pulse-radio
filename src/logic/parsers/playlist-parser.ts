export interface PlaylistEntry {
  url: string;
  name: string;
  duration?: number;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export class PlaylistParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaylistParseError';
  }
}

/** Validate file size before parsing */
export function validateFileSize(content: string): void {
  if (new Blob([content]).size > MAX_FILE_SIZE) {
    throw new PlaylistParseError('File exceeds maximum size of 1MB');
  }
}

/**
 * Parse M3U / M3U8 playlist format.
 * Supports both basic M3U (just URLs) and extended M3U (with #EXTINF).
 */
export function parseM3U(content: string): PlaylistEntry[] {
  validateFileSize(content);
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries: PlaylistEntry[] = [];
  let pendingName = '';
  let pendingDuration: number | undefined;

  for (const line of lines) {
    if (line === '#EXTM3U') continue;

    if (line.startsWith('#EXTINF:')) {
      // Format: #EXTINF:duration,Title
      const match = line.match(/^#EXTINF:(-?\d+),?\s*(.*)$/);
      if (match) {
        const dur = parseInt(match[1], 10);
        pendingDuration = dur > 0 ? dur : undefined;
        pendingName = match[2] || '';
      }
      continue;
    }

    if (line.startsWith('#')) continue; // other comments

    // Must be a URL
    if (line.startsWith('http://') || line.startsWith('https://')) {
      entries.push({
        url: line,
        name: pendingName || extractNameFromUrl(line),
        duration: pendingDuration,
      });
    }
    pendingName = '';
    pendingDuration = undefined;
  }

  return entries;
}

/**
 * Parse PLS (INI-style) playlist format.
 */
export function parsePLS(content: string): PlaylistEntry[] {
  validateFileSize(content);
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const files = new Map<number, string>();
  const titles = new Map<number, string>();
  const lengths = new Map<number, number>();

  for (const line of lines) {
    const fileMatch = line.match(/^File(\d+)=(.+)$/i);
    if (fileMatch) {
      files.set(parseInt(fileMatch[1], 10), fileMatch[2]);
      continue;
    }
    const titleMatch = line.match(/^Title(\d+)=(.+)$/i);
    if (titleMatch) {
      titles.set(parseInt(titleMatch[1], 10), titleMatch[2]);
      continue;
    }
    const lengthMatch = line.match(/^Length(\d+)=(-?\d+)$/i);
    if (lengthMatch) {
      const dur = parseInt(lengthMatch[2], 10);
      if (dur > 0) lengths.set(parseInt(lengthMatch[1], 10), dur);
    }
  }

  const entries: PlaylistEntry[] = [];
  for (const [idx, url] of files) {
    entries.push({
      url,
      name: titles.get(idx) || extractNameFromUrl(url),
      duration: lengths.get(idx),
    });
  }

  return entries;
}

/** Auto-detect format and parse */
export function parsePlaylist(content: string, filename: string): PlaylistEntry[] {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pls') return parsePLS(content);
  return parseM3U(content); // default for .m3u, .m3u8, or unknown
}

/** Generate M3U content from entries */
export function exportM3U(entries: PlaylistEntry[]): string {
  const lines = ['#EXTM3U'];
  for (const e of entries) {
    lines.push(`#EXTINF:${e.duration || -1},${e.name}`);
    lines.push(e.url);
  }
  return lines.join('\n') + '\n';
}

function extractNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return 'Unknown Station';
  }
}
