---
task_id: ARCH-056
target_agent: auto-feature-engineer-finite
target_module: src/hooks/useSmartRecommendations.ts
priority: medium
status: pending
---

# Build Content-Based Station Recommendation Engine

## Context

Pulse Radio tracks extensive listening statistics (top stations, top artists, top genres, listen times) via the `useStats` hook, but this data only surfaces in a stats dashboard. It never drives discovery. The app has a `similarStations()` function that queries the Radio Browser API for stations with matching tags, but this is only used as an error-recovery fallback — never proactively shown to users.

A recommendation engine would transform passive stats into active discovery:
- "Based on your listening, try these stations" section on the home page.
- "Similar to [current station]" button in the now-playing bar.
- "You listen to a lot of Jazz and Lo-Fi — here are Jazz Lo-Fi stations" cross-genre suggestions.

This is the single biggest product differentiator missing from Pulse Radio vs. TuneIn/iHeartRadio.

## Directive

1. **Create `src/hooks/useSmartRecommendations.ts`**:
   ```typescript
   function useSmartRecommendations(stats: UsageStats, favoriteStations: Station[]): {
     recommended: Station[];
     similarToCurrent: Station[];
     isLoading: boolean;
     refresh: () => void;
   }
   ```

2. **Recommendation algorithm** (content-based, no ML needed):
   - **Step 1**: Extract user's top 5 genres and top 5 tags from stats + favorite stations.
   - **Step 2**: Query Radio Browser API for stations matching those tags (use existing `fetchStations()` with tag filtering).
   - **Step 3**: Exclude stations the user has already favorited or recently played.
   - **Step 4**: Score remaining stations by:
     - Tag overlap with user preferences (weighted by listen time).
     - Station popularity (votes) as a tiebreaker.
     - Bitrate (prefer higher quality).
   - **Step 5**: Return top 10 recommendations.

3. **"Similar to current" logic**:
   - Use the existing `similarStations()` function from the Radio Browser API.
   - Expose it proactively (not just on error).
   - Cache results per station UUID to avoid redundant API calls.

4. **Refresh cadence**: Recompute recommendations when stats change meaningfully (every 10 listens or on explicit refresh).

**Boundaries:**
- Do NOT add ML libraries — use simple tag/genre matching.
- Do NOT modify RadioShell.tsx — a separate card will add the recommendations UI section.
- Reuse the existing Radio Browser API client functions.
- Cache recommendations in memory (recalculate on refresh, not on every render).

## Acceptance Criteria

- [ ] `src/hooks/useSmartRecommendations.ts` exists.
- [ ] Recommendations are based on actual user listening data.
- [ ] Already-favorited stations are excluded from recommendations.
- [ ] "Similar to current" returns stations related to what's playing now.
- [ ] Results are cached to avoid excessive API calls.
- [ ] TypeScript compiles without errors.
