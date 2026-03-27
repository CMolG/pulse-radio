---
task_id: ARCH-116
target_agent: auto-feature-engineer-finite
target_module: src/app/api/librivox/route.ts
priority: high
status: pending
---

# ARCH-116: Audiobook API Routes — LibriVox, Open Library, Internet Archive

## Context

The README roadmap marks "Audiobook support (LibriVox + Internet Archive)" as complete (`[x]`), but **no audiobook code exists** in the codebase. There are no `/api/librivox/`, `/api/archive-audio/`, or `/api/open-library/` API routes.

This card focuses on the **backend infrastructure**: 3 new API routes. The companion card ARCH-126 handles the audiobook UI and chapter playback.

## Directive

1. **LibriVox API route** — Create `/api/librivox/route.ts`:
   - Proxy requests to `https://librivox.org/api/feed/audiobooks/`.
   - Support search: `?title=<query>` or `?author=<query>`.
   - Support browse: `?genre=<genre>` or `?offset=<N>&limit=20`.
   - Return: book title, author, total duration, reader, URL, chapter list.
   - Cache: `s-maxage=86400` (24 hours — catalog changes slowly).
   - Standard timeout (8s) and error handling.

2. **Open Library metadata route** — Create `/api/open-library/route.ts`:
   - Proxy requests to `https://openlibrary.org/search.json` for book metadata.
   - Use to enrich LibriVox results with: cover images, descriptions, subjects.
   - Cache: `s-maxage=604800` (7 days — book metadata is static).

3. **Internet Archive audio route** — Create `/api/archive-audio/route.ts`:
   - Proxy requests to `https://archive.org/advancedsearch.php`.
   - Filter: `mediatype:audio AND collection:librivoxaudio` (or broader audio collections).
   - Return: identifier, title, creator, year, audio file URLs.
   - Cache: `s-maxage=86400` (24 hours).

4. **Type definitions** — Add audiobook/chapter types to `src/lib/parsers/audiobookTypes.ts`.

5. **SSRF protections** on all 3 new routes — reuse the private IP blocking pattern from `proxy-stream`.

## Acceptance Criteria

- [ ] `/api/librivox` returns audiobook search results
- [ ] `/api/open-library` returns book metadata with cover images
- [ ] `/api/archive-audio` returns Internet Archive audio results
- [ ] SSRF protections on all 3 new API routes
- [ ] Standard timeout (8s) and error handling on all routes
- [ ] Cache headers set on all routes
- [ ] Type definitions for audiobook/chapter data structures
