---
task_id: ARCH-025
target_agent: auto-reducer
target_module: public/
priority: low
status: pending
---

# Remove Unused SVG Assets from public/

## Context

Three SVG files in `public/` are not referenced anywhere in the codebase (`src/`, `public/site.webmanifest`, `src/app/layout.tsx`, or any component):
- `public/globe.svg` (1.2 KB)
- `public/file.svg` (535 B)
- `public/window.svg` (529 B)

These appear to be leftover template assets (common in Next.js starter projects). They add unnecessary weight to the deployment bundle and confuse asset audits.

## Directive

1. Verify these files are truly unused by searching the entire `src/` directory for references to `globe.svg`, `file.svg`, and `window.svg` (check import statements, `src=` attributes, and CSS `url()` references).
2. Also check `public/sw.js` and `public/offline.html` for references.
3. If confirmed unused, delete all three files.
4. If any file IS referenced, leave it and document where.
5. Run `npm run build` to verify no broken references.

## Acceptance Criteria

- [ ] Unused SVG files removed (or documented if actually used)
- [ ] `npm run build` passes with zero errors
- [ ] No broken image/icon references in the app
