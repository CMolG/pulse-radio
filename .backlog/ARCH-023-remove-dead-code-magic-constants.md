---
task_id: ARCH-023
target_agent: auto-reducer-finite
target_module: src/components/radio/RadioShell.tsx
priority: low
status: pending
---

# Remove Dead Code and Extract Magic Constants

## Context

Several minor code quality issues found during deep scan:

**Dead code:**
- Lines ~4658-4659: `_CANVAS_SCALE_STYLE` and `_IMAGE_RENDER_STYLE` are defined but never referenced anywhere in the file.

**Magic numbers for timeouts (lines ~1707-1786):**
- `5000`, `4000`, `2000`, `1000`, `6000`, `500`, `1500` — reconnect/buffer timeouts used in useRadio hook without named constants.

**Hardcoded color repeated:**
- `'#1a1a2e'` appears as a literal in multiple places (~lines 3728, 3775, 5730, 6107) — this is the app's primary dark background color and should be a shared constant.

## Directive

1. Remove `_CANVAS_SCALE_STYLE` and `_IMAGE_RENDER_STYLE` if confirmed unused (search the entire file first).
2. In the useRadio hook area, extract timeout magic numbers into named constants:
   - `RECONNECT_BASE_MS = 5000`
   - `RECONNECT_SHORT_MS = 2000`
   - `BUFFER_SETTLE_MS = 1500`
   - (Name others appropriately based on their usage context)
3. Extract `'#1a1a2e'` into a constant `BG_PRIMARY = '#1a1a2e'` in constants.ts or at the top of RadioShell, and replace all literal usages.
4. **Minimal, safe changes only** — do not refactor surrounding logic.
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Dead code removed
- [ ] Timeout values have descriptive constant names
- [ ] Hardcoded color centralized
- [ ] `npm run build` passes with zero errors
- [ ] No behavioral changes
