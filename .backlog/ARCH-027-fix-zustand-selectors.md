---
task_id: ARCH-027
target_agent: auto-optimizer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Fix Zustand Store Selector — Eliminate Full-Store Re-renders

## Context

At line ~9909 in RadioShell.tsx, the `usePlaybackStore` Zustand store is referenced without a selector:

```typescript
const pbStore = usePlaybackStore;
useEffect(() => {
  const state = pbStore.getState();
  state.setSource('radio');
  // ...
}, [radio.status, radio.volume, ...]);
```

This pattern stores the entire store object as a dependency. While `.getState()` is used inside effects (avoiding reactive subscription), the reference itself (`const pbStore = usePlaybackStore`) is an unnecessary intermediate variable that creates confusion about whether the component is subscribed to the full store.

More critically, there may be other places where `usePlaybackStore()` is called without a selector (as a hook, not just a reference), which would subscribe the component to ALL store state changes and cause unnecessary re-renders on every `setCurrentTime`, `setTrackInfo`, etc.

## Directive

1. Search RadioShell.tsx for ALL `usePlaybackStore` references. Categorize each as:
   - **Selector call**: `usePlaybackStore((s) => s.field)` — ✅ correct
   - **Full hook call**: `usePlaybackStore()` — ❌ subscribes to everything
   - **Static reference**: `usePlaybackStore.getState()` — ✅ correct for non-reactive access
2. For any full hook calls (`usePlaybackStore()`), replace with specific selectors for only the fields used.
3. For static references used only in effects/callbacks, use `usePlaybackStore.getState()` directly instead of storing the reference.
4. Apply the same audit to `useApiLogStore` — verify it also uses proper selectors.
5. **Do NOT restructure the store** — only fix consumption patterns.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Zero `usePlaybackStore()` calls without selectors (full-store subscriptions)
- [ ] All reactive subscriptions use `(s) => s.specificField` selectors
- [ ] All non-reactive access uses `.getState()` directly
- [ ] `npm run build` passes with zero errors
- [ ] No behavioral changes
