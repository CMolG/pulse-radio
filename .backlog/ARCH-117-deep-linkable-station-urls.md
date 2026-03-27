---
task_id: ARCH-117
target_agent: auto-feature-engineer-finite
target_module: src/app/[countryCode]/page.tsx
priority: medium
status: pending
---

# ARCH-117: Deep-Linkable Station URLs with Query Parameters

## Context

Currently, Pulse Radio has no way to share a specific station via URL. If a user finds a great station and wants to share it with a friend, they can only share the root URL (`pulseradio.app/us`), and the friend sees the default browse view — not the specific station.

Deep-linkable URLs enable:
1. **Social sharing**: Share a station on Twitter/WhatsApp → friend clicks → lands directly on that station playing.
2. **Bookmarking**: Browser bookmarks that restore the exact listening state.
3. **SEO**: Potential for station-specific pages indexed by search engines.
4. **Analytics**: Track which stations attract traffic from external sources.

## Directive

1. **URL scheme**: Use query parameters on existing country routes:
   ```
   /us?station=<stationuuid>           → Auto-play specific station
   /us?station=<stationuuid>&tab=lyrics → Open with lyrics panel visible
   /us?genre=rock                       → Open with genre pre-selected
   ```

2. **Read query params on mount**:
   - In the page component or RadioShell, read `searchParams` on initial load.
   - If `station` param is present: fetch the station by UUID from Radio Browser API, auto-tune to it.
   - If `genre` param is present: pre-select that genre in the browse view.
   - If `tab` param is present: open the corresponding panel (lyrics, settings, theater).

3. **Update URL on station change**:
   - When the user tunes to a station, update the URL using `window.history.replaceState()` (not `pushState` — avoid polluting browser history with every station switch).
   - Format: `?station=<uuid>` appended to the current path.
   - Clear the param when playback stops.

4. **Social share integration**:
   - The existing Web Share API / clipboard share feature (mentioned in README) should generate the deep-link URL instead of the bare domain.
   - Share text: "🎵 Listening to {Station Name} on Pulse Radio — {URL with station param}"

5. **Station resolution**: Create a lightweight API or client-side call to Radio Browser's `stations/byuuid/<uuid>` endpoint to resolve the station from the URL param.

6. **Edge cases**:
   - Invalid/expired station UUID: Show a toast "Station not found" and fall back to default browse.
   - Multiple params: `station` takes precedence over `genre`.

## Acceptance Criteria

- [ ] URL updates with `?station=<uuid>` when a station starts playing
- [ ] Opening a URL with `?station=<uuid>` auto-plays that station
- [ ] Genre pre-selection works via `?genre=<name>` param
- [ ] Social share generates the deep-link URL
- [ ] Invalid station UUIDs show a user-friendly error
- [ ] URL updates use `replaceState` (not `pushState`)
- [ ] Playwright test: navigate to URL with station param → verify station auto-plays
