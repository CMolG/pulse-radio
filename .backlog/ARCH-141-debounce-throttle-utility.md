---
task_id: ARCH-141
target_agent: auto-feature-engineer-finite
target_module: src/lib/debounce.ts
priority: high
status: completed
---

# ARCH-141: Debounce & Throttle Utility Functions

## Context

Multiple backlog cards need debounce/throttle but no shared utility exists. Without this, 4+ cards will independently re-implement timing control, creating inconsistency and duplication:
- ARCH-100 (fuzzy search): 300ms debounce on station query input
- ARCH-125 (podcast UI): 300ms debounce on podcast search
- ARCH-134 (cloud sync): 5s debounce on data push, max 1 push/minute
- ARCH-136 (analytics): 10s batch window for event collection
- ARCH-132 (network resilience): debounced reconnection retry

Currently RadioShell.tsx has inline `setTimeout`/`clearTimeout` patterns for debouncing — these should use the shared utility once extracted.

## Directive

1. **Create `src/lib/debounce.ts`**:
   ```typescript
   export function debounce<T extends (...args: any[]) => any>(
     fn: T,
     delayMs: number
   ): (...args: Parameters<T>) => void;
   ```
   - Returns a debounced function that delays invocation until `delayMs` after the last call.
   - Include a `.cancel()` method on the returned function for cleanup in useEffect.
   - Include a `.flush()` method to execute immediately if pending.

2. **Create `src/lib/throttle.ts`**:
   ```typescript
   export function throttle<T extends (...args: any[]) => any>(
     fn: T,
     intervalMs: number
   ): (...args: Parameters<T>) => void;
   ```
   - Executes at most once per `intervalMs`.
   - Leading edge execution (fires immediately on first call).
   - Include `.cancel()` method.

3. **React hook wrapper** — Create `src/hooks/useDebounce.ts`:
   ```typescript
   export function useDebounce<T>(value: T, delayMs: number): T;
   export function useDebouncedCallback<T extends (...args: any[]) => any>(
     fn: T, delayMs: number, deps: any[]
   ): (...args: Parameters<T>) => void;
   ```
   - Auto-cleanup on unmount (cancel pending timers).
   - Memoized with `useCallback` + `useRef`.

4. **Zero dependencies** — Use only `setTimeout`/`clearTimeout`. No lodash.

## Acceptance Criteria

- [ ] `debounce()` delays execution until idle period
- [ ] `throttle()` limits execution frequency
- [ ] Both have `.cancel()` and debounce has `.flush()`
- [ ] `useDebouncedCallback` hook auto-cancels on unmount
- [ ] `useDebounce` hook returns debounced value
- [ ] TypeScript generics preserve argument types
- [ ] Zero external dependencies
