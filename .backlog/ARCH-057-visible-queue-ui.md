---
task_id: ARCH-057
target_agent: auto-visual-fixer-finite
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Expose Playback Queue UI to Users

## Context

Pulse Radio has a fully functional station queue system (`useStationQueue` hook with add, remove, reorder, next, prev, max 20 stations, localStorage persistence). However, this queue is completely invisible to users. They cannot:

1. See what station will play next.
2. Add a station to "play next" from the browse UI.
3. Reorder the queue.
4. See the queue count.

The queue only manifests through the next/prev skip buttons, which cycle through queued stations without telling the user what's coming. This is like having a playlist with no playlist view.

## Directive

1. **Add a queue indicator badge** to the now-playing bar:
   - Show a small queue count badge (e.g., "3" in a circle) next to the skip-next button.
   - Only visible when queue has > 0 stations.
   - Touch target ≥ 44px (per CLAUDE.md rules).

2. **Add a queue panel** (slide-up on mobile, side panel on desktop):
   - List all queued stations with name, country flag, and genre tag.
   - Current station highlighted.
   - Drag handles or up/down buttons for reordering (use existing `moveUp()`/`moveDown()` from `useStationQueue`).
   - Swipe-to-remove or X button for each station (use existing `remove()`).
   - "Clear queue" button at the bottom.
   - Panel follows the same glassmorphism design language as the settings panel.

3. **Add "Play Next" context action** to station cards in browse view:
   - Long-press or secondary button on a station card.
   - Adds station to position 1 in queue (use existing `addNext()` from `useStationQueue`).
   - Show toast: "Added to queue".

**Boundaries:**
- Use the existing `useStationQueue` hook — do NOT rewrite queue logic.
- Follow the glassmorphism design system (rgba alpha < 0.8, backdrop-blur).
- No absolute-positioned popups inside scroll containers (per CLAUDE.md).
- Queue panel must render inline, scrollable within its container.
- Touch targets ≥ 44px on all interactive elements.
- Must work on mobile viewport (390×844).

## Acceptance Criteria

- [ ] Queue count badge visible on now-playing bar when queue is non-empty.
- [ ] Tapping the badge opens the queue panel.
- [ ] Queue panel shows all queued stations in order.
- [ ] Current station is visually highlighted.
- [ ] Stations can be reordered (up/down or drag).
- [ ] Stations can be removed from queue.
- [ ] "Play Next" action available on station cards.
- [ ] Toast notification on queue add.
- [ ] Panel follows glassmorphism design.
- [ ] All touch targets ≥ 44px.
- [ ] Works on mobile (390×844) and desktop viewports.
- [ ] Playwright test verifies queue panel opens and displays stations.
