---
task_id: ARCH-035
target_agent: auto-optimizer-finite
target_module: .github/workflows/deploy.yml
priority: high
status: pending
---

# Add Build Verification & Test Execution to CI Pipeline

## Context

The current CI/CD pipeline (`.github/workflows/deploy.yml`) SSHs into the VPS and runs `npm install && npm run build && pm2 restart` with zero verification. There are 8 Playwright spec files testing critical UI flows (glassmorphism, audio playback, settings, theater mode, mobile UI), but **none of them run in CI**. There is no lint check. A broken build goes straight to production.

This means:
1. CSS regressions ship undetected.
2. Broken interactive flows (play button, settings panel) reach users.
3. TypeScript errors could slip through.
4. No safety net before production deployment.

## Directive

Modify `.github/workflows/deploy.yml` to add a **build + test gate** that runs BEFORE the SSH deploy step:

1. **Add a `test` job** that runs on `ubuntu-latest`:
   - Checkout code.
   - Setup Node.js (version 18 or 20, match the project).
   - `npm ci` (clean install).
   - `npm run lint` (ESLint).
   - `npm run build` (verify the build succeeds).
   - `npx playwright install --with-deps chromium` (install browser).
   - `npx playwright test --project=mobile-chrome` (run mobile tests).
   - Upload test results as artifacts on failure.

2. **Make the `deploy` job depend on `test`**: Use `needs: test` so deployment only happens if tests pass.

3. **Keep the existing deploy logic unchanged** — only gate it behind the test job.

**Boundaries:**
- Do NOT change the deploy SSH commands or pm2 logic.
- Do NOT add new test files — only run existing tests.
- Do NOT change the trigger (push to main).
- Playwright tests should run against `npm run build && npm start` (not dev server) for production parity. Use `start-server-and-test` pattern or a background process.
- Keep the workflow file readable and well-commented.

## Acceptance Criteria

- [ ] `deploy.yml` has a `test` job that runs lint, build, and Playwright tests.
- [ ] `deploy` job has `needs: test` dependency.
- [ ] If any test fails, deployment is blocked.
- [ ] Test artifacts (screenshots, traces) are uploaded on failure.
- [ ] Workflow syntax is valid YAML (validate with `yamllint` or `act` locally if possible).
- [ ] The deploy step behavior is completely unchanged.
