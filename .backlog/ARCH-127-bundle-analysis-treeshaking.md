---
task_id: ARCH-127
target_agent: auto-optimizer-finite
target_module: next.config.ts
priority: high
status: pending
---

# ARCH-127: Bundle Analysis & Tree-Shaking Audit

## Context

`@next/bundle-analyzer` is installed as a devDependency but not wired into the build pipeline. The project ships two overlapping icon libraries (`react-icons` and `lucide-react`), and `world-countries` sits in devDependencies unused. `next.config.ts` has `images.unoptimized: true` but no `transpilePackages` or `modularizeImports` optimizations. No bundle size budget exists.

Estimated savings: ~80KB from icon library deduplication + tree-shaking alone.

## Directive

1. **Wire `@next/bundle-analyzer`** into `next.config.ts`:
   - Enable via `ANALYZE=true npm run build`.
   - Add `"analyze"` script to `package.json`: `"ANALYZE=true next build"`.

2. **Icon library consolidation**:
   - Audit all icon imports across the codebase (`react-icons/*` and `lucide-react`).
   - Pick one library (prefer `lucide-react` — smaller, tree-shakeable by default).
   - Replace all icons from the removed library with equivalents.
   - Remove the unused library from `package.json`.

3. **Remove unused dependencies**:
   - Verify `world-countries` is not imported anywhere; remove from `package.json`.
   - Scan for any other unused dependencies.

4. **Configure `modularizeImports`** in `next.config.ts` for the chosen icon library (if it doesn't already tree-shake).

5. **Add bundle size budget**:
   - Create `.bundlewatch.config.json` or equivalent CI check.
   - Set budget: First Load JS < 150KB per route.

## Acceptance Criteria

- [ ] `npm run analyze` produces a bundle report
- [ ] Only one icon library remains in `package.json`
- [ ] `world-countries` removed from dependencies
- [ ] No unused dependencies remain
- [ ] Bundle size documented in PR
- [ ] First Load JS reduced by ≥ 50KB
