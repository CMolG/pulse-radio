<!--
  Copyright (c) 2026 Carlos Molina Galindo.
  Open source project: Pulse Radio.
  Created by Carlos Molina Galindo (CMolG on GitHub).
-->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

**IMPORTANT:** Before you start enter plan mode always.

## Visual change verification

Playwright tests are available for verifying UI changes. Run them when explicitly
requested by the user. The Playwright config is at `playwright.config.ts` and
tests live in `tests/`.

### Design and responsiveness rules

1. **No absolute-positioned popups inside scroll containers or slide-up panels** — they
   float away, get clipped, or get stuck. Use inline/flow layout instead.
2. **Always check spacing between sections** — look for unintended dark gaps caused by
   padding/margin stacking. Take screenshots and inspect them.
3. **Touch targets must be ≥44px** — buttons need `w-11 h-11` minimum or equivalent.
4. **Glass/blur effects** — always use `rgba()` with alpha < 0.8 and a tint that visually
   differs from the container background. Include both `backdropFilter` and
   `WebkitBackdropFilter`.
5. **Mobile bottom bar padding** — play button needs visible left padding (`pl-6` on
   container). Content must not hug the screen edges.
6. **Audio badges and verbose labels** — hide on mobile to keep UI clean. Show only in
   desktop or settings panel.
7. **Components embedded in settings panels** — must render inline (no `absolute`
   positioning). EQ, language, and other settings controls must scroll naturally within
   the panel.
