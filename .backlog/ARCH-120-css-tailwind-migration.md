---
task_id: ARCH-120
target_agent: auto-reducer-finite
target_module: src/app/globals.css
priority: low
status: pending
---

# ARCH-120: Audit Custom CSS Utilities & Migrate to Tailwind v4

## Context

`src/app/globals.css` contains ~45 custom utility classes using `@apply` directives. Many of these duplicate functionality already available in Tailwind CSS v4:

- `.flex-center-col` = `flex flex-col items-center justify-center`
- `.pad-xs` / `.pad-sm` / `.pad-md` = `p-1` / `p-2` / `p-4`
- `.col-fill` = `flex flex-col flex-1`
- `.bdr` = `border border-white/10`
- Various `.flex-row-*` utilities

Tailwind v4 supports arbitrary values and `@apply` natively, but maintaining a parallel utility layer creates confusion: developers must check both Tailwind docs AND the custom CSS file to know which class to use. It also increases the CSS payload with duplicate rules.

## Directive

1. **Audit all custom classes** in `globals.css`:
   - For each class, determine if an equivalent Tailwind v4 utility exists.
   - Categorize: "Replace with Tailwind" / "Keep as custom" / "Remove (unused)".

2. **Migrate replaceable classes**:
   - Search RadioShell.tsx for each custom class usage.
   - Replace with the Tailwind equivalent directly in the JSX `className`.
   - Remove the class definition from `globals.css`.

3. **Keep classes that add genuine value**:
   - `.glass-blur` (complex backdrop-filter + webkit prefix) — keep as custom.
   - `.liquid-glass-*` (multi-property SVG filter effects) — keep as custom.
   - `.animate-ambient-drift` (custom keyframe animation) — keep as custom.
   - Theme variables (`@theme` block) — keep as-is.

4. **Dead code removal**:
   - Grep for each custom class across the entire `src/` directory.
   - Any class with zero usage: remove from `globals.css`.

5. **Document remaining custom classes**: Add a comment block at the top of the custom section listing the kept classes and why they can't be replaced.

## Acceptance Criteria

- [ ] All custom classes audited and categorized
- [ ] Replaceable classes migrated to Tailwind utilities in JSX
- [ ] Unused classes removed from globals.css
- [ ] Custom-only classes documented with rationale
- [ ] globals.css is smaller (fewer custom classes)
- [ ] No visual regression — all existing Playwright tests pass
- [ ] `npm run build` passes
