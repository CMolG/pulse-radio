---
task_id: ARCH-070
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Optimize RadioShell Render Performance — Memoize Hot Paths

## Context

RadioShell.tsx has 160+ `React.memo` component definitions, but only ~142 `useMemo`/`useCallback` calls. Analysis reveals 29+ array operations (`.map()`, `.filter()`, `.reduce()`) in render paths without memoization. Combined with the React Compiler (enabled via `reactCompiler: true` in next.config.ts), many of these may be auto-optimized — but the compiler cannot optimize operations that depend on external mutable refs or complex closure patterns.

Key performance concerns:
1. **Array recreation on every render**: `stations.filter(...).map(...)` chains create intermediate arrays.
2. **Inline array constants**: `[0, 1, 2].map(...)` creates a new array reference every render.
3. **Callback props to memoized children**: Event handlers defined inline break `React.memo` barriers.

While React Compiler handles many cases, manual optimization is still needed for:
- Operations involving refs (compiler can't track ref mutations).
- Complex derived state from large datasets (40K+ stations).

## Directive

1. **Hoist constant arrays** outside the component:
   - Find all inline array literals used in `.map()` calls (e.g., `[0, 1, 2].map(...)`, `['rock', 'jazz'].map(...)`).
   - Move them to module-level constants: `const SKELETON_INDICES = [0, 1, 2];`

2. **Memoize expensive derived data**:
   - Station filtering results (when rendering 100+ stations per genre).
   - Genre sorting/ordering (computed from stats).
   - Any `.filter().map()` chains on large arrays.
   - Wrap with `useMemo` and correct dependency arrays.

3. **Stabilize callbacks to memoized children**:
   - Identify event handlers passed as props to `React.memo` components.
   - Wrap with `useCallback` if they reference only stable values.
   - For handlers referencing frequently-changing state, use a ref pattern.

4. **Benchmark before/after**:
   - Use React DevTools Profiler (or `console.time`) on a render cycle.
   - Target: Reduce unnecessary re-renders of station card lists by >50%.

**Boundaries:**
- Do NOT extract components to separate files (that's ARCH-001→010).
- Do NOT change the visual output — only optimize render paths.
- Do NOT fight the React Compiler — only add manual optimizations for patterns the compiler can't handle (ref-dependent, external mutable state).
- Focus on the 10 highest-impact render paths (station list rendering, genre carousel, favorites grid).
- Test with `React.StrictMode` to verify no effects break.

## Acceptance Criteria

- [ ] All inline constant arrays hoisted to module scope.
- [ ] At least 10 expensive computations wrapped in `useMemo`.
- [ ] At least 5 event handler callbacks stabilized with `useCallback`.
- [ ] No visual regression (UI looks identical).
- [ ] `npm run build` passes.
- [ ] All existing Playwright tests pass.
- [ ] React DevTools Profiler shows reduced unnecessary re-renders.
