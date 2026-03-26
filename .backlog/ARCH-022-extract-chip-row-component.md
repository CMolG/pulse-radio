---
task_id: ARCH-022
target_agent: auto-reducer
target_module: src/components/radio/RadioShell.tsx
priority: medium
status: pending
---

# Extract Duplicated Genre/Country ChipRow into Reusable Component

## Context

In BrowseView (~lines 3687-3783), the genre selection row and country selection row use near-identical JSX:
- Both render a scrollable row of pill buttons with `px-3 py-2 rounded-full text-[12px]`
- Both have an "All" button with active/inactive styling
- Both have a `<select>` dropdown with identical styling for overflow items
- Both use `[&::-webkit-scrollbar]:hidden [scrollbar-width:none]`
- The only differences are: data source (genres vs countries), click handler, and active state check.

This is ~90 lines of duplicated markup that could be a single `<ChipRow>` component.

## Dependencies

- **Run AFTER ARCH-001** (Extract BrowseView) if possible. If ARCH-001 is complete, the ChipRow extraction targets `src/components/radio/views/BrowseView.tsx`. If not, target `RadioShell.tsx` directly.

## Directive

1. Create a `ChipRow` component (can live in the BrowseView file or in `src/components/radio/components/ChipRow.tsx`).
2. Props: `items: { key: string, label: string }[]`, `activeKey: string | null`, `onSelect: (key: string | null) => void`, `allLabel: string`, `dropdownPlaceholder: string`, `rowLimit?: number`.
3. Replace both the genre and country chip rows with `<ChipRow>` instances.
4. Preserve all existing styling, scrollbar hiding, and select dropdown behavior.
5. **Do NOT change any visual appearance** — the output HTML should be functionally identical.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Single `ChipRow` component replaces both genre and country rows
- [ ] ~90 lines of duplication eliminated
- [ ] Visual appearance identical (verify with Playwright screenshot)
- [ ] `npm run build` passes with zero errors
