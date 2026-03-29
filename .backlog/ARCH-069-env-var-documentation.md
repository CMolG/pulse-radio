---
task_id: ARCH-069
target_agent: auto-feature-engineer-finite
target_module: .env.example
priority: high
status: completed
---

# Create Environment Variable Documentation

## Context

Pulse Radio requires environment variables for production operation, but there is:
- No `.env.example` file.
- No documentation of which variables are required vs. optional.
- No setup instructions in the README.

A new developer cloning the repo has no way to know they need `CRON_SECRET` for the cache sync endpoint or that `BANDSINTOWN_APP_ID` has a fallback default. This is a contributor onboarding blocker.

## Directive

1. **Create `.env.example`** at project root:
   ```env
   # Pulse Radio Environment Configuration
   # Copy this file to .env.local and fill in values

   # Required for production: Secures the /api/cron/sync endpoint
   # Generate with: openssl rand -hex 32
   CRON_SECRET=

   # Optional: Bandsintown API key for concert data
   # Falls back to a demo key if not set
   BANDSINTOWN_APP_ID=

   # Optional: Override the base URL for metadata/SEO
   # Defaults to http://localhost:3000 in development
   NEXT_PUBLIC_BASE_URL=
   ```

2. **Scan ALL source files** for `process.env.*` references. Document every variable found, including:
   - Whether it's required or optional.
   - What happens if it's missing (fallback behavior).
   - Where it's used (which route/component).

3. **Add an "Environment Setup" section to README.md**:
   - After the "Getting Started" section.
   - List all environment variables with descriptions.
   - Include the `cp .env.example .env.local` command.

4. **Add `.env.local` to `.gitignore`** if not already present.

**Boundaries:**
- Do NOT create actual secrets or API keys.
- Do NOT modify any source code — only create `.env.example` and update README/gitignore.
- Include comments in `.env.example` explaining each variable.

## Acceptance Criteria

- [ ] `.env.example` exists with all environment variables documented.
- [ ] Each variable has a comment explaining its purpose and whether it's required.
- [ ] README.md has an "Environment Setup" section.
- [ ] `.env.local` is in `.gitignore`.
- [ ] All `process.env.*` references in source code are accounted for.
