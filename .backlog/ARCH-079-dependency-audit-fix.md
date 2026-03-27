---
task_id: ARCH-079
target_agent: auto-optimizer-finite
target_module: package.json
priority: critical
status: completed
---

# Audit & Fix Dependency Vulnerabilities + Pin Node Version

## Context

`npm audit` reports 14 vulnerabilities (13 moderate + 1 high):
- **`brace-expansion` <5.0.5**: Zero-step sequence DoS — transitive via eslint-config-next → minimatch.
- **`esbuild` ≤0.24.2**: GHSA-67mh-4wv8-2f99 (development server CSRF) — transitive via drizzle-kit.

Additionally:
- No `engines` field in `package.json` — developers/CI could use any Node version (18, 20, 22) with different build outputs.
- No `.nvmrc` or `.node-version` file for version manager auto-switching.
- `world-countries` v5.1.0 is in `devDependencies` but is likely used at runtime (i18n country codes in `src/context/LocaleContext.tsx`).
- No `peerDependencies` declared for React 19 / Next.js 16.

## Directive

1. **Resolve vulnerabilities**:
   ```bash
   npm audit fix
   ```
   If `audit fix` cannot resolve (locked transitive deps), use overrides in `package.json`:
   ```json
   "overrides": {
     "brace-expansion": "^5.0.5"
   }
   ```
   For `esbuild` (devDependency chain): update `drizzle-kit` to latest.

2. **Add Node.js version lock**:
   - Add to `package.json`:
     ```json
     "engines": { "node": ">=20.0.0" }
     ```
   - Create `.nvmrc` at project root containing `20`.

3. **Fix `world-countries` placement**:
   ```bash
   npm install world-countries  # moves to dependencies
   npm uninstall world-countries --save-dev  # remove from devDeps
   ```
   Or manually move it in `package.json` from `devDependencies` to `dependencies`.

4. **Add peer dependencies** (informational, not enforced):
   ```json
   "peerDependencies": {
     "react": "^19.0.0",
     "react-dom": "^19.0.0"
   }
   ```

5. **Verify**: `npm audit` should report 0 high/critical vulnerabilities.

**Boundaries:**
- Do NOT upgrade major versions of direct dependencies (only fix transitive vuln paths).
- Do NOT remove dependencies — only fix/update/move them.
- `npm run build` must still pass after changes.

## Acceptance Criteria

- [ ] `npm audit` reports 0 high vulnerabilities.
- [ ] `engines.node` set to `>=20.0.0` in `package.json`.
- [ ] `.nvmrc` exists with value `20`.
- [ ] `world-countries` in `dependencies` (not `devDependencies`).
- [ ] `npm run build` passes.
- [ ] `package-lock.json` regenerated cleanly.
