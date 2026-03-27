---
task_id: ARCH-100
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-100: Implement Fuzzy Station Search

## Context

The README roadmap lists "Station search with fuzzy matching" as an incomplete milestone. Currently, users browse stations by genre/country chips and scrolling through lists, but there is **no search bar** — a critical UX gap for a catalog of 40,000+ stations. Users cannot find a specific station by name without scrolling through hundreds of results. This is the single most impactful missing product feature.

## Directive

1. **Add a persistent search bar** at the top of the BrowseView area (or above the station list if BrowseView hasn't been extracted yet). It must be a controlled input with debounced querying (300ms debounce).

2. **Client-side fuzzy matching** using a lightweight algorithm (Jaro-Winkler or a simple trigram approach — do NOT add a dependency like Fuse.js). Match against:
   - `station.name`
   - `station.tags` (genre tags)
   - `station.country`
   - `station.language`

3. **Radio Browser API server search**: If the client-side result set is empty or fewer than 5 matches, fall back to the Radio Browser API's `stations/search` endpoint with the query term. Proxy this through a new `/api/station-search/route.ts` endpoint to maintain the CORS proxy pattern.

4. **Result ranking**: Sort results by a composite score of:
   - Fuzzy match score (primary)
   - Station vote count (secondary — higher votes = more relevant)
   - Station bitrate (tertiary — higher quality preferred)

5. **UI requirements**:
   - Search icon (Lucide `Search`) inside the input
   - Clear button (Lucide `X`) when input is non-empty
   - "No results" empty state with a suggestion to try different keywords
   - Results displayed using the existing `StationCard` layout
   - Touch target compliance: input height ≥ 44px

6. **Performance**: Memoize the filtered results list. Do NOT re-run fuzzy matching on every render — only when the debounced query changes.

## Acceptance Criteria

- [ ] Search bar is visible and accessible on both mobile and desktop viewports
- [ ] Typing a query filters the station list in real-time (debounced)
- [ ] Fuzzy matching tolerates typos (e.g., "clasc" matches "Classic Rock")
- [ ] Empty query restores the default browse view
- [ ] Fallback to Radio Browser API search when local results are insufficient
- [ ] Clear button resets the search
- [ ] Playwright test covering: type query → see results → clear → see default view
