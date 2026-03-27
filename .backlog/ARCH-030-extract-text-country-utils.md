---
task_id: ARCH-030
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: low
status: pending
---

# Extract Text Utilities and Country/Locale Helpers

## Context

RadioShell contains ~220 lines of pure utility functions with no React dependencies:

**Text utilities (~120 lines):**
- `normalizeText` (~40 lines) — diacritic removal, whitespace normalization, with caching
- `clamp01` (~3 lines) — numeric clamping
- `stationInitials` (~8 lines) — extract initials from station name
- `primaryArtist` (~7 lines) — strip featured artists
- `cleanFeatFromTitle` (~3 lines) — remove "(feat.)" from song titles
- `formatTimeAgo` (~7 lines) — relative time formatting
- `_tagsDisplay` (~15 lines) — format station tags for display
- `appendReferrer` (~22 lines) — add referrer params to URLs
- `jaroDistance` (~34 lines) — Jaro string distance algorithm
- `jaroWinkler` (~10 lines) — Jaro-Winkler string similarity

**Country/locale helpers (~100 lines):**
- `localeCandidates` — fallback locale chain
- `localeFromLang3` — ISO 639-3 to locale mapping
- `getCountryDisplayName` — localized country name with Intl.DisplayNames
- `getSameLanguageCountries` — countries sharing a language
- `getProximityCountries` — geographic proximity by borders
- `uniquePush` — dedup helper for arrays
- `getCountryChipsForLocale` — ordered country chips for the UI

## Directive

1. Create `src/lib/textUtils.ts` — move all text utility functions and their associated regex constants (`DIACRITIC_RE`, `NON_ALPHANUM_RE`, `WHITESPACE_RE`, `_normalizeCache`, `_FEAT_*_RE`).
2. Create `src/lib/countryUtils.ts` — move all country/locale helper functions. Import `SupportedLocale` from `@/lib/i18n/locales` and country data from `@/lib/i18n/countries`.
3. Update RadioShell and any extracted views to import from new paths.
4. **Pure extraction** — no logic changes.
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `src/lib/textUtils.ts` and `src/lib/countryUtils.ts` created
- [ ] `RadioShell.tsx` reduced by ~220 lines
- [ ] `npm run build` passes with zero errors
- [ ] No circular dependencies
