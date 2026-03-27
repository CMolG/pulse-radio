---
task_id: ARCH-126
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-126: Audiobook Browse UI & Chapter Playback

## Context

ARCH-116 delivers the backend (LibriVox, Open Library, Internet Archive API routes and type definitions). This card builds the **frontend**: audiobook browsing, chapter listing, and sequential playback with chapter navigation controls.

Depends on: **ARCH-116** (audiobook API routes must exist first).

## Directive

1. **Audiobooks tab** — Add an "Audiobooks" tab in the browse navigation:
   - Reuse the existing tab switching pattern in RadioShell.tsx.
   - Default view: featured/popular audiobooks from LibriVox.

2. **Audiobook search & browse**:
   - Search bar: debounced (300ms) query to `/api/librivox?title=<query>`.
   - Book cards: cover image (from `/api/open-library`), title, author, total duration.
   - Genre filter: allow browsing by genre.

3. **Chapter list view** — Clicking a book card opens the chapter list:
   - Display all chapters with: title, duration, play button.
   - Highlight currently playing chapter.
   - Scroll within the browse panel (no absolute positioning).

4. **Sequential playback**:
   - Auto-advance to the next chapter when the current one ends.
   - Previous/Next chapter buttons in the player controls (visible when `source: 'audiobook'`).
   - Chapter progress indicator: "Chapter 3 of 24".
   - Seek bar showing position within current chapter.
   - Integrate with ARCH-102 (resume position tracking) — critical for audiobooks.

5. **Playback integration**:
   - Set `source: 'audiobook'` in the Zustand playback store.
   - Update Media Session metadata with chapter title, book title, cover art.
   - Media Session `previoustrack`/`nexttrack` handlers for chapter navigation.

6. **Mobile-first design**:
   - Touch targets ≥ 44px on all interactive elements.
   - Chapter list scrollable within panel.
   - No absolute-positioned popups.

## Acceptance Criteria

- [ ] Audiobooks tab appears in browse navigation
- [ ] Users can search audiobooks by title/author
- [ ] Book cards display with cover art, title, author, duration
- [ ] Chapter list is navigable and playable
- [ ] Chapters auto-advance on completion
- [ ] Previous/Next chapter controls work
- [ ] Chapter progress indicator shows current position
- [ ] Media Session integrates with chapter navigation
- [ ] Mobile viewport (390×844) renders correctly
- [ ] Playwright test: browse audiobooks → select book → play chapter → verify playback
