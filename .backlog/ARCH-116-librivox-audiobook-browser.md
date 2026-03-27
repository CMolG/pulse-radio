---
task_id: ARCH-116
target_agent: auto-feature-engineer-finite
target_module: src/app/api/librivox/route.ts
priority: high
status: pending
---

# ARCH-116: Implement LibriVox Audiobook Browser

## Context

The README roadmap marks "Audiobook support (LibriVox + Internet Archive)" as complete (`[x]`), but **no audiobook code exists** in the codebase. There are:
- No `/api/librivox/` or `/api/archive-audio/` or `/api/open-library/` API routes
- No audiobook browsing UI
- No chapter-level playback
- No LibriVox or Internet Archive integration

LibriVox provides free public domain audiobooks — a perfect complement to a radio app. Users who listen to radio during the day may switch to audiobooks at night. Internet Archive's audio collection adds depth. This creates a complete audio experience comparable to Audible's free tier.

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

4. **Audiobook UI** (in RadioShell.tsx or extracted component):
   - Add an "Audiobooks" tab in browse navigation.
   - Book cards: cover image (from Open Library), title, author, duration.
   - Chapter list view: show all chapters with individual play buttons.
   - Sequential playback: auto-advance to next chapter when current one ends.
   - Integrate with ARCH-102 (resume position tracking) — critical for audiobooks.

5. **Chapter navigation**:
   - Previous/Next chapter buttons in the player controls when source is audiobook.
   - Chapter progress indicator: "Chapter 3 of 24".
   - Seek bar showing position within current chapter.

## Acceptance Criteria

- [ ] `/api/librivox` returns audiobook search results
- [ ] `/api/open-library` returns book metadata with cover images
- [ ] `/api/archive-audio` returns Internet Archive audio results
- [ ] Audiobooks tab appears in browse navigation
- [ ] Book cards display with cover art, title, author
- [ ] Chapter list is navigable and playable
- [ ] Chapters auto-advance on completion
- [ ] Previous/Next chapter controls work
- [ ] SSRF protections on all new API routes
- [ ] Playwright test: browse audiobooks → select book → play chapter → verify playback
