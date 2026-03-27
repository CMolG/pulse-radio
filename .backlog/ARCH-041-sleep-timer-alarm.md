---
task_id: ARCH-041
target_agent: auto-feature-engineer-finite
target_module: src/hooks/useSleepTimer.ts
priority: medium
status: pending
---

# Extract & Enhance Sleep Timer with Alarm/Wake Feature

## Context

Pulse Radio has a sleep timer feature embedded somewhere in the 10,935-line RadioShell component. This is a standard radio feature, but it can be elevated to a differentiating product feature by adding **alarm/wake mode** — the inverse of sleep timer. Users who fall asleep to radio often want to wake up to it too. This is a natural product evolution for an internet radio player:

1. **Sleep Timer** (existing): Fade out and stop playback after N minutes.
2. **Wake Timer** (new): Start playback of a saved station at a scheduled time (morning alarm).

This combines two features: extracting the sleep timer logic into a reusable hook AND adding the alarm capability.

## Directive

1. **Extract `src/hooks/useSleepTimer.ts`**:
   - Move sleep timer logic out of RadioShell into a dedicated hook.
   - Interface: `useSleepTimer({ onSleep: () => void })` returns `{ sleepIn, setSleepIn, remainingSeconds, isActive, cancel }`.
   - `sleepIn` is minutes (15, 30, 45, 60, 90, 120, or null for off).
   - Implement volume fade-out over the last 30 seconds before stopping.
   - Persist the sleep timer setting to localStorage so it survives page refresh.

2. **Add `src/hooks/useWakeTimer.ts`**:
   - Interface: `useWakeTimer({ onWake: (stationUrl: string) => void })` returns `{ wakeAt, setWakeAt, stationUrl, setStationUrl, isScheduled, cancel }`.
   - `wakeAt` is a time string (HH:MM) or null.
   - Uses `setTimeout` calculated from current time to target time.
   - If the target time is in the past today, schedule for tomorrow.
   - Calls `onWake(stationUrl)` when the alarm fires.
   - Persist to localStorage.
   - **Important**: This works only while the tab is open (browser limitation). Add a comment noting this constraint.

**Boundaries:**
- Do NOT modify RadioShell.tsx — a separate integration card will wire these hooks.
- Do NOT add any UI — these are pure logic hooks.
- Do NOT use the Notification API or Web Push (out of scope).
- Keep both hooks independent — they should work separately or together.

## Acceptance Criteria

- [ ] `src/hooks/useSleepTimer.ts` exists with clean extracted logic.
- [ ] Sleep timer fades volume over last 30 seconds.
- [ ] `src/hooks/useWakeTimer.ts` exists with alarm scheduling logic.
- [ ] Wake timer correctly calculates delay to target time.
- [ ] Both hooks persist state to localStorage.
- [ ] Both hooks clean up timeouts on unmount.
- [ ] TypeScript compiles without errors.
