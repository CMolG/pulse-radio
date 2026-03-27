---
task_id: ARCH-115
target_agent: auto-feature-engineer-finite
target_module: src/app/api/podcast-search/route.ts
priority: high
status: pending
---

# ARCH-115: Implement Podcast Discovery & Playback

## Context

The README roadmap marks "Podcast support" as complete (`[x]`), but **no podcast code exists** in the codebase. There are:
- No podcast API routes (no `/api/podcast-search/`, no `/api/podcast-feed/`)
- No podcast UI components
- No RSS feed parser
- No podcast search functionality
- No episode listing or playback controls

The only podcast-adjacent code is a `media=podcast` query parameter in the iTunes API route for artwork lookup. ARCH-048 will correct the README, but this card implements the actual feature.

Podcast support is a natural extension of a radio app — users who listen to live radio also consume on-demand audio content. This is a high-value feature that increases daily active usage (podcast episodes give users a reason to return).

## Directive

1. **Podcast search API** — Create `/api/podcast-search/route.ts`:
   - Proxy searches to the iTunes Search API (`media=podcast&entity=podcast`).
   - Return: podcast name, author, artwork URL, feed URL, genre.
   - Cache results: `s-maxage=3600` (1 hour).
   - Apply standard timeout (8s) and error handling patterns from existing routes.

2. **Podcast feed parser API** — Create `/api/podcast-feed/route.ts`:
   - Accept a `feedUrl` query parameter.
   - Fetch and parse the RSS/XML feed server-side (avoid CORS issues).
   - Extract episodes: title, description, audio enclosure URL, duration, publication date.
   - Return the 50 most recent episodes (paginated if needed).
   - Cache: `s-maxage=1800` (30 minutes).
   - Validate the URL against SSRF protections (reuse the private IP blocking from `proxy-stream`).

3. **RSS parser** — Create `src/lib/parsers/rssParser.ts`:
   - Parse XML using the built-in `DOMParser` (server-side: use a lightweight XML parser or regex-based extraction).
   - Extract: `<item>` elements with `<title>`, `<enclosure url="...">`, `<itunes:duration>`, `<pubDate>`, `<description>`.
   - Handle both RSS 2.0 and Atom feed formats.
   - Do NOT add external XML parsing dependencies — use `TextDecoder` + string parsing.

4. **Podcast UI** (in RadioShell.tsx or extracted component):
   - Add a "Podcasts" tab in the browse navigation (alongside genres/countries).
   - Search bar for podcast discovery (reuse the search input pattern).
   - Podcast cards showing: artwork, name, author.
   - Clicking a podcast opens an episode list view.
   - Episode cards showing: title, duration, date.
   - Play button on each episode that feeds the audio URL to the existing player.
   - Integrate with ARCH-102 (resume position tracking) if available.

5. **Playback integration**:
   - Set `source: 'podcast'` in the Zustand playback store.
   - Update Media Session metadata with episode info.
   - Show episode progress bar (seek-enabled) instead of the live radio indicator.

## Acceptance Criteria

- [ ] `/api/podcast-search` returns podcast results from iTunes
- [ ] `/api/podcast-feed` parses RSS feeds and returns episodes
- [ ] Podcasts tab appears in browse navigation
- [ ] Users can search for podcasts by name
- [ ] Episode list displays for selected podcast
- [ ] Clicking an episode plays the audio
- [ ] Player shows episode title, podcast name, and artwork
- [ ] Seek bar works (not live streaming — on-demand content)
- [ ] SSRF protections applied to feed URL fetching
- [ ] Playwright test: search podcast → select → play episode → verify audio src set
