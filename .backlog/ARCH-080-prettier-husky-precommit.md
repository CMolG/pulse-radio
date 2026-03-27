---
task_id: ARCH-080
target_agent: auto-feature-engineer-finite
target_module: package.json
priority: high
status: completed
---

# Add Prettier + Husky Pre-Commit Hooks

## Context

The codebase has ESLint configured (`eslint.config.mjs`) but **no code formatter** and **no pre-commit hooks**:
- No `.prettierrc` — code formatting is inconsistent across 14.8K lines.
- No husky or lint-staged — broken code can be committed without lint checks.
- No formatting enforcement means merge conflicts from style differences.

For a project with multiple AI agents writing code (auto-reducer, auto-feature-engineer, etc.), consistent formatting is essential to avoid noisy diffs.

## Directive

1. **Install Prettier**:
   ```bash
   npm install -D prettier eslint-config-prettier
   ```

2. **Create `.prettierrc`**:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "all",
     "printWidth": 100,
     "tabWidth": 2,
     "arrowParens": "always"
   }
   ```
   Match the existing code style (inspect RadioShell.tsx for conventions).

3. **Create `.prettierignore`**:
   ```
   node_modules/
   .next/
   .data/
   public/
   *.md
   ```

4. **Install Husky + lint-staged**:
   ```bash
   npm install -D husky lint-staged
   npx husky init
   ```

5. **Configure lint-staged** in `package.json`:
   ```json
   "lint-staged": {
     "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
     "*.{json,css,md}": ["prettier --write"]
   }
   ```

6. **Add npm scripts**:
   ```json
   "format": "prettier --write 'src/**/*.{ts,tsx}'",
   "format:check": "prettier --check 'src/**/*.{ts,tsx}'"
   ```

7. **Update `eslint.config.mjs`** to include `eslint-config-prettier` (disables formatting rules that conflict with Prettier).

**Boundaries:**
- Do NOT reformat the entire codebase in this card (that would be a massive diff). Only set up the tools.
- The pre-commit hook should catch new code only (lint-staged operates on staged files).
- Do NOT add commitlint or conventional commits (separate concern).

## Acceptance Criteria

- [ ] `.prettierrc` exists with project-appropriate settings.
- [ ] `.prettierignore` exists.
- [ ] `npm run format` works (formats source files).
- [ ] `npm run format:check` works (CI-friendly check).
- [ ] Pre-commit hook runs ESLint + Prettier on staged `.ts/.tsx` files.
- [ ] `npm run build` passes.
