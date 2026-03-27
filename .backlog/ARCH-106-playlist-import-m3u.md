---
task_id: ARCH-106
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: completed
---

# ARCH-106: M3U/PLS Playlist Import & Export

## Context

M3U and PLS are the **industry-standard formats** for internet radio playlists. Every radio directory (TuneIn, SHOUTcast, Icecast) exports stations in these formats. Many users maintain personal `.m3u` playlists of their favorite stations. Currently, Pulse Radio has no way to import these files — forcing users to manually find and re-add their stations one by one. This is a major adoption barrier for power users migrating from desktop radio players (VLC, Winamp, foobar2000).

## Directive

1. **M3U Parser** (`src/lib/parsers/m3uParser.ts`):
   - Parse both M3U (basic) and EXTINF-extended M3U formats.
   - Extract: stream URL, station name (from `#EXTINF` title), duration (if present).
   - Handle both `\n` and `\r\n` line endings.
   - Ignore comment lines (`#` prefix except `#EXTINF` and `#EXTM3U`).
   - Return `Array<{ url: string; name: string; duration?: number }>`.

2. **PLS Parser** (`src/lib/parsers/plsParser.ts`):
   - Parse INI-style PLS format (`[playlist]`, `FileN=`, `TitleN=`, `LengthN=`).
   - Return the same structure as M3U parser for consistency.

3. **Import UI**:
   - Add an "Import Playlist" button in the favorites/library section.
   - Use the native `<input type="file" accept=".m3u,.m3u8,.pls">` (hidden, triggered by button click).
   - On file selection: parse the file, resolve each URL against the Radio Browser API to find matching stations (match by `url_resolved` field), and add matches to favorites.
   - For URLs not found in Radio Browser: create a "custom station" entry with the URL and name from the playlist file.
   - Show an import summary: "Imported X stations (Y matched, Z added as custom)".

4. **Export**:
   - Add an "Export as M3U" button in the favorites section.
   - Generate a valid EXTINF M3U file from the user's favorites list.
   - Trigger a download via `Blob` + `URL.createObjectURL()`.

5. **File validation**: Reject files larger than 1MB. Show error for invalid format.

## Acceptance Criteria

- [ ] M3U files with EXTINF metadata are parsed correctly
- [ ] PLS files are parsed correctly
- [ ] Import resolves stations against Radio Browser API
- [ ] Unmatched URLs are added as custom stations
- [ ] Import summary shows match/custom counts
- [ ] Export generates a valid M3U file downloadable by the browser
- [ ] Files > 1MB are rejected with an error message
- [ ] Playwright test: import a sample M3U file → verify stations appear in favorites
