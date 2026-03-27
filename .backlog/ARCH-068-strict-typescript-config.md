---
task_id: ARCH-068
target_agent: auto-optimizer-finite
target_module: tsconfig.json
priority: medium
status: pending
---

# Enable Stricter TypeScript Configuration & Remove `any` Types

## Context

`tsconfig.json` has `"strict": true` enabled, which is a good baseline. However, several additional strictness flags are missing that would catch real bugs:

- **`noUncheckedIndexedAccess`**: Array/object index access returns `T` instead of `T | undefined`, hiding potential undefined access bugs.
- **`noUnusedLocals`**: Dead variables aren't flagged.
- **`noUnusedParameters`**: Unused function parameters aren't flagged.
- **`noFallthroughCasesInSwitch`**: Switch case fall-throughs aren't caught.

Additionally, there are at least 4 explicit `any` type annotations in the codebase:
1. `fetchJson<{ artists?: any[] }>` in artist-info route.
2. Multiple `any` types in cron sync route for MusicBrainz/Bandsintown API responses.
3. `clearTimer(ref: React.MutableRefObject<any>)` in RadioShell.

These should be replaced with proper interfaces.

## Directive

1. **Enable additional strict flags** in `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "noUncheckedIndexedAccess": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true
     }
   }
   ```

2. **Fix resulting TypeScript errors**:
   - Add null checks for indexed access (e.g., `arr[i]?.property`).
   - Remove or prefix unused variables with `_`.
   - Remove unused parameters or prefix with `_`.
   - Add `break` to switch cases.

3. **Replace `any` types** with proper interfaces:
   - Create `MusicBrainzArtist` interface for artist-info responses.
   - Create `BandsintownEvent` interface for concert responses.
   - Type `clearTimer` ref as `React.MutableRefObject<ReturnType<typeof setTimeout> | null>`.

4. **Remove unsafe `as unknown` casts** where possible — replace with proper type narrowing.

**Boundaries:**
- Do NOT change runtime behavior — only type annotations and null checks.
- If enabling a flag produces >50 errors, consider enabling it with a `// @ts-expect-error` comment on the most complex cases and creating a follow-up card.
- Do NOT modify any business logic.
- Do NOT change the `target` or `module` settings.

## Acceptance Criteria

- [ ] `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled.
- [ ] Zero `any` type annotations remain in `/src/app/api/` routes.
- [ ] `clearTimer` properly typed.
- [ ] `npm run build` passes with zero TypeScript errors.
- [ ] No runtime behavior changes.
