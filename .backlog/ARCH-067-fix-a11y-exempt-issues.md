---
task_id: ARCH-067
target_agent: auto-visual-fixer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Fix Remaining Exempt Accessibility Issues (7 Low-Contrast + 2 Text-11px)

## Context

The accessibility audit (`a11y_results.tsv`) reports that all major WCAG AA issues have been fixed across 54 commits. However, the closing audit notes **9 exempted items** that were deliberately skipped:

- **2 text elements at 11px** (below the 12px minimum established in earlier fixes).
- **7 low-contrast elements** (below the WCAG AA 4.5:1 ratio for normal text).

These were marked as "exempt" with justifications (decorative badges, inactive states, secondary metadata). However, for full WCAG AA compliance and to avoid regression creep, these should be resolved.

## Directive

1. **Identify the 9 exempt elements**: Search RadioShell.tsx for:
   - Text with `text-[11px]` or `text-xs` (which maps to ~12px, but may be smaller with line-height).
   - Elements using `text-white/25`, `text-white/30`, `text-white/35` or similar low-opacity values that fail the 4.5:1 contrast ratio against the `#0a0f1a` background.

2. **Fix the 2 text-11px items**:
   - Increase to `text-[12px]` minimum.
   - If the element is truly decorative (not conveying information), add `aria-hidden="true"` and keep the size.

3. **Fix the 7 low-contrast items**:
   - Increase opacity to at least `text-white/50` (which yields ~5.25:1 against `#0a0f1a`).
   - If the element is decorative or a disabled state indicator, add `aria-hidden="true"`.
   - If it's an inactive button/tab, ensure the contrast still meets 3:1 minimum for non-text elements.

4. **Verify with contrast checker**: For each fix, calculate the actual contrast ratio against the background color to confirm WCAG AA compliance.

**Boundaries:**
- Do NOT change the design language — only adjust opacity/size to meet minimums.
- Do NOT modify elements that are already WCAG AA compliant.
- Focus only on the 9 identified exempt items.
- Take screenshots before/after to verify visual impact is minimal.

## Acceptance Criteria

- [ ] All text elements are ≥12px (except items marked `aria-hidden="true"`).
- [ ] All text elements meet 4.5:1 contrast ratio against their background.
- [ ] Non-text interactive elements meet 3:1 contrast ratio.
- [ ] Visual design impact is minimal (similar look, just slightly more readable).
- [ ] Playwright tests pass on mobile-chrome project.
- [ ] `npm run build` passes.
