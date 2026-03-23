<!--
  Copyright (c) 2026 Carlos Molina Galindo.
  Open source project: Pulse Radio.
  Created by Carlos Molina Galindo (CMolG on GitHub).
-->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Visual change verification

Always verify visual/UI changes with Playwright before considering them done.
Run the relevant Playwright tests (or write new ones) to confirm that CSS properties,
layout behavior, and visual appearance match expectations. Screenshots should be
reviewed for any regression. The Playwright config is at `playwright.config.ts` and
tests live in `tests/`.
