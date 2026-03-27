---
task_id: ARCH-086
target_agent: auto-reducer-finite
target_module: src/lib
priority: low
status: pending
---

# Add Barrel Files for Clean Module Exports

## Context

The project has only 2 barrel files (`index.ts`/`index.tsx`):
- `src/components/radio/index.tsx` — exports RadioApp
- `src/lib/db/index.ts` — exports db and schema

Missing barrel files for:
- `src/lib/services/` — only `CacheRepository.ts`, no `index.ts`
- `src/components/common/` — no `index.tsx`
- `src/lib/audio-visualizer/` — no `index.ts`
- `src/lib/i18n/` — no `index.ts`
- `src/hooks/` — no `index.ts`
- `src/context/` — no `index.ts`

Without barrel files, imports are verbose (`from '@/lib/services/CacheRepository'`) and module boundaries are unclear. As the codebase grows with extracted components (ARCH-001→016, 071, 072), clean exports become more important.

## Directive

1. **Create barrel files** for each module directory:
   - `src/lib/services/index.ts` — export `CacheRepository` and any future services.
   - `src/components/common/index.tsx` — export all common components.
   - `src/lib/audio-visualizer/index.ts` — export visualization utilities.
   - `src/lib/i18n/index.ts` — export i18n configuration and utilities.
   - `src/context/index.ts` — export all context providers.

2. **Export only public API** — don't re-export internal helpers.

3. **Use named exports** (not default exports) for better tree-shaking:
   ```typescript
   export { CacheRepository } from './CacheRepository';
   export type { CacheEntry } from './types';
   ```

4. **Update imports** in files that consume these modules to use the barrel path.

**Boundaries:**
- Do NOT create barrel files for directories with only 1 file (unnecessary).
- Do NOT re-export everything — only public API surface.
- Only create barrel files for directories that exist and have 2+ exported modules.
- If a directory currently has only 1 file, create the barrel file anyway if extraction cards (ARCH-001→016) will add more files soon.

## Acceptance Criteria

- [ ] Barrel files exist for at least 4 module directories.
- [ ] Imports updated to use barrel paths where beneficial.
- [ ] `npm run build` passes.
- [ ] No circular import errors.
