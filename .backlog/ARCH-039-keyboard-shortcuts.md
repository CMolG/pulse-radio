---
task_id: ARCH-039
target_agent: auto-feature-engineer-finite
target_module: src/hooks/useKeyboardShortcuts.ts
priority: medium
status: pending
---

# Add Global Keyboard Shortcuts

## Context

Pulse Radio has excellent MediaSession API integration for OS-level media keys, but there are no in-app keyboard shortcuts. Desktop users cannot:

1. Press **Space** to play/pause (standard in every media player).
2. Use **arrow keys** for volume control.
3. Press **M** to mute.
4. Press **Escape** to close modals/panels (partially implemented for some panels, but not globally).
5. Press **?** to see available shortcuts.

For a desktop radio player, keyboard shortcuts are an industry-standard expectation. This is especially important for accessibility — keyboard-only users rely on these.

## Directive

Create a custom hook `src/hooks/useKeyboardShortcuts.ts`:

1. **Shortcuts**:
   | Key | Action |
   |-----|--------|
   | `Space` | Toggle play/pause (only when no input/textarea is focused) |
   | `ArrowUp` | Volume up 5% |
   | `ArrowDown` | Volume down 5% |
   | `M` | Toggle mute |
   | `Escape` | Close active modal/panel/theater mode |
   | `T` | Toggle theater mode |
   | `L` | Toggle lyrics panel |
   | `?` or `/` | Show shortcuts help overlay |

2. **Guard**: Do NOT fire shortcuts when user is typing in a search input, textarea, or contenteditable element. Check `document.activeElement?.tagName` and `isContentEditable`.

3. **Implementation**:
   - Single `useEffect` with `keydown` event listener on `document`.
   - Accept callbacks via props/params: `{ onPlayPause, onVolumeUp, onVolumeDown, onMute, onEscape, onTheaterToggle, onLyricsToggle }`.
   - Prevent default for handled keys (e.g., prevent Space from scrolling).

4. **Shortcuts Help**: The `?` key should trigger a callback that the consuming component can use to show a help overlay. The hook itself should NOT render any UI.

**Boundaries:**
- This hook is a pure logic hook — NO UI rendering.
- Do NOT modify RadioShell.tsx in this card — a separate integration card will wire the hook.
- Do NOT add any npm dependencies.
- Must work on both Mac and Windows (no platform-specific key codes).

## Acceptance Criteria

- [ ] `src/hooks/useKeyboardShortcuts.ts` exists with the hook exported.
- [ ] All 8 shortcuts are handled with correct key detection.
- [ ] Shortcuts are suppressed when user is typing in form elements.
- [ ] `Space` does not scroll the page when handled.
- [ ] TypeScript compiles without errors.
- [ ] Hook is stateless and side-effect-clean (removes listener on unmount).
