---
task_id: ARCH-111
target_agent: auto-visual-fixer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-111: Accessibility — Skip Links, Focus Management & Live Regions

## Context

An accessibility audit reveals that while RadioShell.tsx has basic ARIA attributes (12+ `aria-label`, `aria-pressed`, `aria-hidden` instances), it is missing several WCAG 2.1 AA-required patterns:

1. **No skip links**: Screen reader and keyboard users must tab through the entire navigation, genre chips, station list, and controls to reach the main content area. A "Skip to player" link is mandatory for keyboard accessibility.

2. **No focus trapping in modals**: The song detail modal, settings panel, stats modal, and theater mode do not trap focus — keyboard users can tab "behind" the modal into invisible content.

3. **No focus restoration**: When a modal closes, focus is not restored to the element that opened it. The user's focus position is lost.

4. **Insufficient ARIA live regions**: Only 1 `role="status"` exists. Track changes (new song playing), error messages, and loading states should be announced to screen readers via `aria-live="polite"` or `aria-live="assertive"`.

## Directive

1. **Skip link** (highest priority):
   - Add a visually-hidden "Skip to player" link as the first focusable element in the DOM.
   - On focus, it becomes visible (standard pattern: `sr-only focus:not-sr-only`).
   - Clicking it focuses the now-playing area / play button.

2. **Focus trap for modals/panels**:
   - Implement a reusable focus trap utility (or hook) that:
     - On open: moves focus to the first focusable element in the modal.
     - Traps Tab/Shift+Tab within the modal boundaries.
     - On Escape: closes the modal.
     - On close: restores focus to the trigger element.
   - Apply to: song detail modal, settings panel, stats modal, EQ panel, theater mode.

3. **ARIA live region for track changes**:
   - Add a visually-hidden `<div aria-live="polite">` that announces:
     - "Now playing: {Artist} — {Track} on {Station}" when track changes.
     - "Playback paused" / "Playback resumed" on play/pause.
     - "Error: Unable to connect to station" on playback failures.
   - Do NOT announce every metadata poll — only when the track actually changes.

4. **Heading hierarchy**:
   - Add an `<h1>` for "Pulse Radio" (can be visually hidden if design doesn't show it).
   - Use `<h2>` for section headings (Browse, Now Playing, Settings, Favorites, History).
   - Ensure heading levels are sequential (no `<h1>` → `<h3>` skip).

5. **Use native HTML elements where possible**: `<button>` instead of `<div role="button">`, `<dialog>` for modals where supported.

## Acceptance Criteria

- [ ] Skip link is present and works (keyboard Tab → visible → click → focus on player)
- [ ] Focus is trapped inside open modals/panels
- [ ] Focus is restored to trigger element when modal closes
- [ ] Track changes are announced via `aria-live` region
- [ ] Heading hierarchy is sequential (h1 → h2 → h3, no skips)
- [ ] No `<div role="button">` without keyboard handler — use `<button>` instead
- [ ] Playwright test: Tab through the page → skip link appears → press Enter → focus lands on player
