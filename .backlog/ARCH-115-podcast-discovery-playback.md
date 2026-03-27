---
task_id: ARCH-115
target_agent: auto-feature-engineer-finite
target_module: src/app/api/podcast-search/route.ts
priority: high
status: pending
---

# ARCH-115: Podcast API Routes & RSS Parser

## Context

The README roadmap marks "Podcast support" as complete (`[x]`), but **no podcast code exists** in the codebase. There are:
- No podcast API routes (no `/api/podcast-search/`, no `/api/podcast-feed/`)
- No podcast UI components
- No RSS feed parser
- No podcast search functionality
- No episode listing or playback controls

The only podcast-adjacent code is a `media=podcast` query parameter in the iTunes API route for artwork lookup. ARCH-048 will correct the README. This card implements the **backend infrastructure** (API routes + RSS parser). The companion card ARCH-125 handles the podcast UI and playback integration.

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

4. **Type definitions** — Add podcast/episode types to `src/lib/parsers/podcastTypes.ts`.

## Acceptance Criteria

- [ ] `/api/podcast-search` returns podcast results from iTunes
- [ ] `/api/podcast-feed` parses RSS feeds and returns episodes
- [ ] RSS parser handles both RSS 2.0 and Atom formats
- [ ] SSRF protections applied to feed URL fetching
- [ ] Standard timeout (8s) and error handling on both routes
- [ ] Cache headers set on both routes
- [ ] Type definitions for podcast/episode data structures
