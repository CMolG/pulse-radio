---
task_id: ARCH-006
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Extract SongDetailModal from RadioShell

## Context

`_SongDetailModal` (~line 5106, ~470 lines) is a complex modal showing song details, lyrics, artist info, concerts, and sharing. It's wrapped with `React.memo` as `SongDetailModal` (~line 5578). It depends on `ShareButton` (~line 5069), `shareContent` (~line 5062), and `useArtistInfo` (~line 5022). These should be co-extracted.

## Directive

1. Create `src/components/radio/components/SongDetailModal.tsx` as a `'use client'` component.
2. Move `_SongDetailModal`, `SongDetailModal` memo wrapper, `ShareButton`, `shareContent`, and `SongDetailModalProps` type.
3. Also move `useArtistInfo` hook into the file (or into `src/components/radio/hooks/useArtistInfo.ts` if it could be reused elsewhere — prefer the hooks directory).
4. Import shared types from `../constants.ts` and shared utilities.
5. Update RadioShell imports.
6. **Pure extraction** — no behavioral changes.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `SongDetailModal` in `src/components/radio/components/SongDetailModal.tsx`
- [ ] `useArtistInfo` extracted to `src/components/radio/hooks/useArtistInfo.ts`
- [ ] `RadioShell.tsx` reduced by ~500+ lines
- [ ] `npm run build` passes with zero errors
- [ ] Song detail modal opens and displays all sections correctly
