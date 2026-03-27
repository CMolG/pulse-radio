---
task_id: ARCH-098
target_agent: auto-visual-fixer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# Fix aria-modal Contradiction in Equalizer Dialog

## Context

The Equalizer panel in RadioShell.tsx is rendered as a dialog with contradictory ARIA attributes:

```tsx
<div ... role="dialog" aria-modal="false" aria-label="Equalizer">
```

Meanwhile, the component implements proper focus-trapping logic (~line 4500):
```tsx
const focusable = modal.querySelectorAll(...)
```

This contradiction breaks assistive technology:
- `aria-modal="false"` tells screen readers the background is **interactive** — but the focus trap prevents keyboard access to it.
- Screen readers won't announce the dialog as modal, confusing blind users.
- Focus escapes are inconsistent between keyboard and ARIA expectations.
- Violates WCAG 4.1.2 (Name, Role, Value) — the component's role doesn't match its behavior.

## Directive

1. **Set `aria-modal="true"`** on the Equalizer dialog container:
   ```tsx
   <div role="dialog" aria-modal="true" aria-label="Equalizer">
   ```

2. **Audit all other `role="dialog"` instances** in RadioShell.tsx:
   - Search for all elements with `role="dialog"`.
   - Verify each has `aria-modal="true"` if it traps focus.
   - Verify each has a descriptive `aria-label` or `aria-labelledby`.

3. **Ensure background is inert** when the dialog is open:
   - The content behind the dialog should have `aria-hidden="true"` or use the `inert` attribute.
   - This prevents screen readers from navigating background content.

4. **Verify focus management**:
   - Focus moves to the dialog when opened.
   - Focus returns to the trigger element when closed.
   - Tab key cycles within the dialog (focus trap).

**Boundaries:**
- Do NOT restructure the dialog component — only fix ARIA attributes.
- Do NOT convert to a `<dialog>` element (that's a larger refactor).
- Do NOT change the visual appearance.

## Acceptance Criteria

- [ ] All `role="dialog"` elements have correct `aria-modal` value matching behavior.
- [ ] Equalizer dialog has `aria-modal="true"`.
- [ ] Background content has `aria-hidden="true"` when dialog is open.
- [ ] Focus moves to dialog on open, returns to trigger on close.
- [ ] `npm run build` passes.
- [ ] Playwright test: verify `aria-modal="true"` attribute on equalizer panel.
