---
task_id: ARCH-102
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/RadioShell.tsx
priority: high
status: pending
---

# ARCH-102: Podcast & Audiobook Resume Position Tracking

## Context

The app supports podcast and audiobook playback (LibriVox, Internet Archive, RSS feeds), but there is **no resume/progress tracking**. When a user closes the app mid-episode and returns later, they must manually seek to where they left off. This is a fundamental gap — every podcast player (Spotify, Apple Podcasts, Overcast) tracks playback position. Without it, the podcast/audiobook features feel incomplete.

## Directive

1. **Playback position persistence**:
   - Store the current playback position (in seconds) for each podcast episode / audiobook chapter in `localStorage` under a key like `radio-playback-positions`.
   - Data structure: `Record<string, { position: number; duration: number; updatedAt: number }>` where the key is a unique episode/chapter identifier (RSS enclosure URL or archive.org identifier).
   - Persist position every **10 seconds** during playback (throttled, not on every `timeupdate` event).
   - Cap stored entries at **200** with LRU eviction (oldest `updatedAt` removed first).

2. **Resume on play**:
   - When a user plays a podcast episode or audiobook chapter that has a saved position, automatically seek to that position.
   - Show a brief toast notification: "Resuming from X:XX" (using the existing toast/notification pattern if one exists, or a simple fade-in/fade-out overlay).

3. **Progress indicators**:
   - On podcast episode cards and audiobook chapter cards, show a **progress bar** at the bottom of the card (thin 2px bar, colored with the accent color) indicating `position / duration` as a percentage.
   - Add a **"Played"** badge (small checkmark or dot) for episodes where `position / duration > 0.95` (95% complete).

4. **Mark as played / unplayed**:
   - Add a context action (long-press on mobile, right-click or overflow menu on desktop) to manually mark an episode as played or unplayed.
   - "Mark as played" sets position to duration. "Mark as unplayed" removes the position entry.

5. **Use the existing `storageUtils.ts`** patterns for quota handling and JSON serialization.

## Acceptance Criteria

- [ ] Playback position is saved every 10 seconds during podcast/audiobook playback
- [ ] Resuming a partially-played episode seeks to the saved position
- [ ] Progress bar appears on episode/chapter cards with saved positions
- [ ] Episodes > 95% played show a "Played" indicator
- [ ] Manual mark as played/unplayed works
- [ ] Position data is capped at 200 entries with LRU eviction
- [ ] Playwright test: play episode → seek to 50% → reload → play again → verify resume
