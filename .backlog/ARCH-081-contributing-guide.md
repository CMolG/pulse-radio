---
task_id: ARCH-081
target_agent: auto-feature-engineer-finite
target_module: CONTRIBUTING.md
priority: medium
status: completed
---

# Create CONTRIBUTING.md & Developer Setup Guide

## Context

Pulse Radio has no contributor documentation. A new developer cloning the repo must reverse-engineer the setup process:
- No documented development workflow (fork, branch, PR).
- No local setup instructions beyond `npm run dev` in README.
- No testing requirements before PR submission.
- No code style guidelines (until ARCH-080 adds Prettier/Husky).
- No architecture overview for orientation.

The project uses AI agents for automated code changes (`AGENTS.md`, `.backlog/`), which is non-standard and requires explanation.

## Directive

1. **Create `CONTRIBUTING.md`** at project root with these sections:

   **Getting Started**:
   - Prerequisites: Node.js 20+, npm
   - Clone, install, run dev server
   - Copy `.env.example` to `.env.local` (reference ARCH-069)

   **Development Workflow**:
   - Fork the repo, create a feature branch
   - Make changes, write/update tests
   - Run `npm run build` + `npx playwright test --project=mobile-chrome`
   - Open a pull request against `main`

   **Testing Requirements**:
   - All Playwright E2E tests must pass before merge
   - UI changes need mobile viewport (390×844) verification
   - New features should include Playwright tests

   **Code Style**:
   - TypeScript strict mode
   - Tailwind CSS for styling (no inline styles)
   - Reference `.prettierrc` and ESLint config

   **Architecture Overview**:
   - Single-page radio PWA
   - `RadioShell.tsx` is the main component (extraction in progress)
   - 3-tier cache: Memory → SQLite → External API
   - API routes in `src/app/api/`

   **Agentic Workflow**:
   - Brief explanation of `.backlog/` cards and AGENTS.md
   - How automated agents execute cards
   - How humans interact with the system

2. **Add a "Contributing" section to README.md** linking to `CONTRIBUTING.md`.

**Boundaries:**
- Keep it under 200 lines — concise and scannable.
- Do NOT document internal APIs (that's JSDoc's job).
- Do NOT duplicate README content — link to it.

## Acceptance Criteria

- [ ] `CONTRIBUTING.md` exists at project root.
- [ ] Covers: setup, workflow, testing, style, architecture, agentic system.
- [ ] README.md links to CONTRIBUTING.md.
- [ ] Under 200 lines.
