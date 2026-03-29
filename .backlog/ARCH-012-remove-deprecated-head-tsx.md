---
task_id: ARCH-012
target_agent: auto-reducer-finite
target_module: src/app/[countryCode]/head.tsx
priority: medium
status: completed
---

# Remove Deprecated head.tsx and Consolidate into generateMetadata

## Context

`src/app/[countryCode]/head.tsx` uses the legacy App Router `head.tsx` convention which is deprecated in modern Next.js. The `[countryCode]/page.tsx` already has `generateMetadata()` which is the correct pattern. The head.tsx file generates geo-location meta tags (`geo.region`, `geo.placename`) that should be merged into the existing `generateMetadata()` function.

## Directive

1. Read the existing `head.tsx` to identify all meta tags it generates (likely `geo.region`, `geo.placename`, and possibly other geo-specific tags).
2. Merge these meta tags into the `generateMetadata()` export in `[countryCode]/page.tsx` using the `other` field of the Next.js Metadata API.
3. Delete `src/app/[countryCode]/head.tsx`.
4. Verify the generated HTML still contains the geo meta tags by checking the build output or running a dev server.
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `head.tsx` deleted
- [ ] All geo meta tags preserved in `generateMetadata()` using the `other` metadata field
- [ ] `npm run build` passes with zero errors
- [ ] Country pages still have correct geo meta tags in rendered HTML
