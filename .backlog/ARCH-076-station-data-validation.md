---
task_id: ARCH-076
target_agent: auto-optimizer-finite
target_module: src/components/radio/constants.ts
priority: high
status: pending
---

# Add Runtime Validation for Station & Track Data Models

## Context

The `Station` and `TrackFields` types in `src/components/radio/constants.ts` are TypeScript-only — they provide **zero runtime validation**. Data flows into the app from:

1. **radio-browser.info API** — station metadata (URL, name, country, codec, bitrate, favicon).
2. **localStorage** — favorites, history, recently played stations.
3. **ICY metadata** — currently playing track info from stream headers.

None of these sources are validated at runtime. If radio-browser.info returns a station with a missing `url_resolved` field, or if localStorage contains corrupted station data from a schema migration, the app will crash with an unhelpful `Cannot read properties of undefined` error deep in the render tree.

## Directive

1. **Create Zod schemas** for core data models in `src/components/radio/schemas.ts`:
   ```typescript
   export const StationSchema = z.object({
     stationuuid: z.string(),
     name: z.string().min(1),
     url_resolved: z.string().url(),
     favicon: z.string().url().optional().default(''),
     country: z.string().optional().default(''),
     codec: z.string().optional().default(''),
     bitrate: z.number().min(0).optional().default(0),
     votes: z.number().min(0).optional().default(0),
     // ... remaining fields with sensible defaults
   });
   ```

2. **Validate at ingestion boundaries** (not in hot render paths):
   - When fetching stations from radio-browser.info (in the initial data load).
   - When loading favorites/history from localStorage (in the hydration step).
   - When receiving ICY metadata from the proxy-stream endpoint.

3. **Handle validation failures gracefully**:
   - Malformed stations: skip silently (filter out, don't crash).
   - Malformed localStorage data: clear the corrupted key + log a warning.
   - Malformed ICY metadata: show "Unknown" as fallback title/artist.

4. **Export typed versions** for use throughout the app:
   ```typescript
   export type Station = z.infer<typeof StationSchema>;
   ```

**Boundaries:**
- Do NOT validate on every render (only at data ingestion).
- Do NOT block app startup if validation fails — degrade gracefully.
- Reuse Zod from ARCH-073 if installed; otherwise install it.
- Do NOT change the Station type shape — only add validation.

## Acceptance Criteria

- [ ] `src/components/radio/schemas.ts` exists with `StationSchema` and `TrackFieldsSchema`.
- [ ] Station data validated when loaded from API.
- [ ] Favorites/history validated when loaded from localStorage.
- [ ] Malformed data filtered out gracefully (no crashes).
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
