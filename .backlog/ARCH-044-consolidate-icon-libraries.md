---
task_id: ARCH-044
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Consolidate Icon Libraries — Remove react-icons, Keep Lucide

## Context

The project imports from TWO icon libraries:
1. **`lucide-react`** (v0.475.0) — Primary library, used extensively (40+ icons).
2. **`react-icons`** (v5.6.0) — Secondary library, used for a handful of icons.

Both libraries ship large bundles. `react-icons` alone can add 50KB+ to the client bundle because it doesn't tree-shake as well as `lucide-react`. Having two icon libraries is architectural bloat — every icon in `react-icons` has an equivalent in `lucide-react`.

## Directive

1. **Audit all `react-icons` imports**: Search for every `import { ... } from 'react-icons/...'` across the entire project.
2. **Find Lucide equivalents**: For each `react-icons` icon used, find the equivalent in `lucide-react`. Common mappings:
   - `FaPlay` → `Play`, `FaPause` → `Pause`, `FaHeart` → `Heart`
   - `IoMdSettings` → `Settings`, `IoMdClose` → `X`
   - `BsMusic` → `Music`, `BsStar` → `Star`
3. **Replace all imports**: Swap every `react-icons` import with the `lucide-react` equivalent.
4. **Verify visual parity**: Lucide icons may have slightly different stroke weights/sizes. Ensure the UI looks correct after replacement. Adjust `size` or `strokeWidth` props if needed.
5. **Remove `react-icons` from `package.json`**: Run `npm uninstall react-icons`.

**Boundaries:**
- Do NOT add any new icon library.
- Do NOT change icon sizes, colors, or layout — only swap the import source.
- If a `react-icons` icon has NO equivalent in Lucide, document it and keep `react-icons` (but this is unlikely given Lucide's 1300+ icon set).
- Run `npm run build` to verify tree-shaking benefit.

## Acceptance Criteria

- [ ] Zero imports from `react-icons` remain in the codebase.
- [ ] `react-icons` removed from `package.json` dependencies.
- [ ] All icons render correctly with Lucide equivalents.
- [ ] `npm run build` passes.
- [ ] Bundle size decreased (verify with `ANALYZE=true npm run build` if analyzer is configured).
- [ ] All existing Playwright tests pass.
