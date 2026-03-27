---
task_id: ARCH-026
target_agent: auto-visual-fixer-finite
target_module: src/app/globals.css
priority: low
status: completed
---

# Consolidate Duplicate Text Opacity Utilities in globals.css

## Context

`globals.css` defines two utility classes with identical output:
- `.text-subtle { @apply text-white/50; }`
- `.text-dim { @apply text-white/50; }`

Both produce the exact same `rgba(255, 255, 255, 0.5)` color. Having two classes with identical styles creates confusion about which to use. After examining prior a11y work in `a11y_results.tsv`, both classes were bumped from different starting opacities (white/30 and white/40) to white/50 — they converged accidentally.

If the semantic intent is different (e.g., `.text-subtle` for labels, `.text-dim` for secondary info), they should have distinct opacities. If not, one should be removed.

## Directive

1. Search RadioShell.tsx and all component files for usages of both `.text-subtle` and `.text-dim`.
2. Determine if they are used in semantically different contexts (labels vs metadata vs placeholders).
3. **Option A** (preferred): If they serve different purposes, differentiate them — e.g., `.text-subtle` at `text-white/45` and `.text-dim` at `text-white/50` (maintaining WCAG AA on dark backgrounds).
4. **Option B**: If they are interchangeable, remove one and replace all usages with the survivor.
5. Verify contrast ratios remain ≥ 4.5:1 against `#0a0f1a` background.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] No two utility classes produce identical output
- [ ] Contrast ratios still meet WCAG AA (≥ 4.5:1)
- [ ] `npm run build` passes with zero errors
- [ ] Visual appearance verified with Playwright screenshot test on mobile viewport
