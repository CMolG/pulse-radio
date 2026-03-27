---
task_id: ARCH-055
target_agent: auto-feature-engineer-finite
target_module: src/hooks/useStationFilters.ts
priority: medium
status: pending
---

# Add Advanced Station Filtering (Bitrate, Codec, Language)

## Context

The Radio Browser API returns rich metadata for each station including `bitrate`, `codec`, `language`, and `tags`. Currently, Pulse Radio only uses genre categories and country for filtering. Power users who care about audio quality have no way to:

1. Filter stations by **minimum bitrate** (e.g., only 192kbps+ stations for quality listening).
2. Filter by **codec** (e.g., prefer AAC/OPUS over MP3 for better quality at lower bitrates).
3. Filter by **language** (e.g., show only English-language stations regardless of country).
4. Filter by **multiple tags** simultaneously.

These are standard features in mature radio aggregators like TuneIn and radio.net.

## Directive

1. **Create `src/hooks/useStationFilters.ts`**:
   ```typescript
   interface StationFilters {
     minBitrate: number | null;      // e.g., 128, 192, 256, 320
     codecs: string[];               // e.g., ['MP3', 'AAC', 'OPUS', 'FLAC']
     languages: string[];            // e.g., ['english', 'spanish']
     tags: string[];                 // e.g., ['rock', 'indie']
   }

   function useStationFilters(): {
     filters: StationFilters;
     setFilter: (key: keyof StationFilters, value: any) => void;
     resetFilters: () => void;
     applyFilters: (stations: Station[]) => Station[];
     hasActiveFilters: boolean;
   }
   ```

2. **`applyFilters(stations)`**: Pure function that filters a station array based on active filters. All filters are AND-combined (bitrate >= min AND codec in list AND language matches).

3. **Persist filters** to localStorage so they survive page refresh.

4. **Extract available filter values** from loaded stations:
   - Unique codecs found across all stations.
   - Unique languages found.
   - Bitrate distribution (to suggest meaningful thresholds).

**Boundaries:**
- Do NOT modify RadioShell.tsx — a separate card will integrate the filter UI.
- Do NOT modify the Radio Browser API calls — filtering happens client-side on already-fetched data.
- Do NOT add npm dependencies.
- Keep the hook stateless relative to the station data (it only filters, doesn't fetch).

## Acceptance Criteria

- [ ] `src/hooks/useStationFilters.ts` exists with the described interface.
- [ ] Bitrate filtering works (e.g., filter to only 192kbps+ stations).
- [ ] Codec filtering works (e.g., only AAC stations).
- [ ] Language filtering works.
- [ ] Multiple filters combine with AND logic.
- [ ] Filters persist to localStorage.
- [ ] `resetFilters()` clears all filters.
- [ ] TypeScript compiles without errors.
