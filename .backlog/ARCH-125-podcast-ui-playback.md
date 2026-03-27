---
task_id: ARCH-125
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: blocked
---

# ARCH-125: Podcast Browse UI & Playback Integration

## Context

ARCH-115 delivers the backend (podcast search API, feed parser API, RSS parser, type definitions). This card builds the **frontend**: podcast browsing, episode listing, and playback integration with the existing audio player.

Depends on: **ARCH-115** (podcast API routes must exist first).

## Directive

1. **Podcasts tab** — Add a "Podcasts" tab in the browse navigation (alongside genres/countries):
   - Reuse the existing tab switching pattern in RadioShell.tsx.
   - Default view: popular/trending podcasts (top results from iTunes).

2. **Podcast search** — Add a search bar within the Podcasts tab:
   - Debounced search input (300ms) that queries `/api/podcast-search`.
   - Display podcast cards: artwork, name, author, genre.
   - Reuse the station card layout pattern.

3. **Episode list view** — Clicking a podcast card opens an episode list:
   - Fetch episodes from `/api/podcast-feed?feedUrl=<url>`.
   - Display: episode title, duration, publication date, truncated description.
   - Play button on each episode.
   - Scroll within the browse panel (no absolute positioning).

4. **Playback integration**:
   - Set `source: 'podcast'` in the Zustand playback store.
   - Feed the episode audio URL to the existing `<audio>` element.
   - Update Media Session metadata with episode title, podcast name, artwork.
   - Show a seek-enabled progress bar (not the live radio indicator).
   - Integrate with ARCH-102 (resume position tracking) if that card is completed.

5. **Mobile-first design**:
   - Touch targets ≥ 44px on all interactive elements.
   - Episode cards must be scrollable within the panel.
   - No absolute-positioned popups.

## Acceptance Criteria

- [ ] Podcasts tab appears in browse navigation
- [ ] Users can search for podcasts by name
- [ ] Podcast cards display with artwork, name, author
- [ ] Episode list displays for selected podcast
- [ ] Clicking an episode plays the audio via existing player
- [ ] Player shows episode title, podcast name, and artwork
- [ ] Seek bar works for on-demand content
- [ ] Mobile viewport (390×844) renders correctly
- [ ] Playwright test: search podcast → select → play episode → verify audio src set
