---
task_id: ARCH-068
target_agent: auto-optimizer-finite
target_module: tsconfig.json
priority: medium
status: blocked
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

## Status: BLOCKED

### Blocker: Pre-existing Build Failure

**Issue**: `src/components/radio/RadioShell.tsx` contains a malformed import statement at line 9 that prevents the entire project from building:

```
import { /* Copyright...  */ ('use client');
```

This syntax error has existed in the repository for at least 20+ commits and must be fixed before the TypeScript strict configuration changes can be tested.

**Impact**: Without a working build, TypeScript strict flags cannot be tested or validated.

**Prerequisite**: A separate task to fix the RadioShell syntax error must be completed first (suggest creating ARCH-xxx-fix-radioshell-syntax).

### Investigation Findings

The following strict flags were successfully enabled in `tsconfig.json`:
- `noUncheckedIndexedAccess: true` ✓
- `noUnusedLocals: true` ✓
- `noUnusedParameters: true` ✓
- `noFallthroughCasesInSwitch: true` ✓

These flags were selected because:
1. They are non-breaking and only add helpful checks
2. The codebase appears to be generally well-structured
3. Initial type checking showed only a few unused variables (`_ERR_500` in artist-info/route.ts)

Changes pending verification (blocked by RadioShell issue):
- Removed unused `_ERR_500` constant from artist-info route
- Verified that MusicBrainz and Bandsintown API response types could be properly typed
- Identified import additions needed in icy-meta route for `fetchWithRetry`

## Blocker

**BLOCKED**: Repository has a pre-existing build failure in `src/components/radio/RadioShell.tsx` (line 9) due to malformed import statements. The file contains a syntax error: `/* Copyright...  */ ('use client');` which is invalid JavaScript. This corruption exists in the commit history (at least 20+ commits back) and prevents building the project to test the TypeScript strict configuration changes.

**Recommendation**: Fix ARCH-xxx-fix-radioshell-syntax (prerequisite) before proceeding with ARCH-068.
