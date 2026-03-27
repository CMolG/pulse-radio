---
task_id: ARCH-112
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# ARCH-112: Listening Statistics Dashboard

## Context

Pulse Radio stores play history (up to 100 entries) and tracks favorites, but provides **zero insights** into listening behavior. Every major audio platform (Spotify Wrapped, Apple Music Replay, Last.fm) offers listening statistics because users love seeing their habits quantified. For a radio app with 40K+ stations across genres and countries, the data is inherently interesting.

This is a low-effort, high-delight feature that increases user engagement and retention. Users who see their stats are more likely to return and explore new content.

## Directive

1. **Statistics computation** (client-side, from existing localStorage data):
   - **Total listening time**: Estimate from history entries (each entry = 1 session, approximate average session length or track position deltas if available).
   - **Top 5 stations**: Ranked by play count from history.
   - **Top 5 genres**: Extracted from station tags in history.
   - **Top 5 countries**: From station country codes in history.
   - **Listening streaks**: Consecutive days with at least one play session (requires dates from history entries).
   - **Discovery count**: Number of unique stations played.

2. **Stats UI**:
   - Accessible via a "📊 Stats" button in the settings panel or sidebar.
   - Use the existing stats modal pattern (ARCH-003 references a stats view).
   - **Desktop**: Floating centered modal (per AGENTS.md: "Desktop stats modal — floating centered dialog").
   - **Mobile**: Bottom sheet slide-up.
   - Display stats as simple cards with icons and numbers (no complex charts — keep bundle small).
   - Animate numbers counting up on open (use Motion/Framer Motion).

3. **Data enrichment**:
   - Extend the history entry shape to include a `listenedAt: number` (Unix timestamp) if not already present. This enables time-based analytics.
   - If history entries already have timestamps, use them. If not, add timestamps going forward (old entries without timestamps are excluded from time-based stats).

4. **Performance**: Compute stats lazily (only when the stats view opens). Cache the computed results in a `useMemo` or `useRef` to avoid recomputation on re-renders.

## Acceptance Criteria

- [ ] Stats button is accessible in settings or sidebar
- [ ] Stats view shows: total stations, top stations, top genres, top countries
- [ ] Stats are computed from existing localStorage history data
- [ ] Desktop renders as centered modal; mobile as bottom sheet
- [ ] Numbers animate on view open
- [ ] Stats computation is lazy (only on open) and cached
- [ ] Playwright test: open stats → verify data renders → close stats → verify modal dismissed
