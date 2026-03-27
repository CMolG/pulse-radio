---
task_id: ARCH-066
target_agent: auto-feature-engineer-finite
target_module: src/lib/__tests__
priority: high
status: completed
---

# Set Up Unit Testing Framework & Add Tests for Core Utilities

## Context

Pulse Radio has 8 Playwright E2E specs for UI testing but **zero unit tests**. There is no Jest or Vitest configuration, no `test` script in `package.json`, and no coverage reporting. The `/src/lib/` directory contains 12 exported utility functions (storageUtils, server-cache, CacheRepository, cache-keys normalization) that handle critical operations — localStorage persistence, SQLite caching, and data normalization — with zero test coverage.

Bugs in these utilities (e.g., cache key normalization stripping valid characters, storage quota failures not detected) propagate silently through the entire application. Unit tests for these pure functions are high-value, low-effort wins.

## Directive

1. **Install Vitest** (preferred over Jest for Next.js + TypeScript projects):
   ```bash
   npm install -D vitest @vitejs/plugin-react
   ```
   Create a minimal `vitest.config.ts` at project root.

2. **Add npm scripts** to `package.json`:
   ```json
   "test:unit": "vitest run",
   "test:unit:watch": "vitest",
   "test:unit:coverage": "vitest run --coverage"
   ```

3. **Write unit tests for these critical modules**:

   **`src/lib/storageUtils.test.ts`** (5 tests minimum):
   - `trySave()` returns true on success, false on quota error.
   - `tryLoad()` returns null for missing keys.
   - `ensureStorageVersion()` clears keys when version mismatches.
   - `isQuotaExceeded()` correctly detects DOMException.
   - SSR-safe: functions return defaults when `window` is undefined.

   **`src/lib/services/server-cache.test.ts`** (4 tests minimum):
   - LRU cache respects max size (evicts oldest on overflow).
   - TTL expiration works (expired entries return undefined).
   - `cacheSet()` and `cacheGet()` round-trip correctly.
   - Namespace isolation (different namespaces don't collide).

4. **Mock localStorage** using a simple Map-based mock for the storageUtils tests.

**Boundaries:**
- Do NOT install Jest — use Vitest (better ESM/TypeScript support for Next.js).
- Do NOT test React components (that's Playwright's job).
- Do NOT test API routes (they need integration tests with SQLite, out of scope).
- Focus on pure utility functions that are easy to test in isolation.
- Do NOT add coverage thresholds yet (let it grow organically).

## Acceptance Criteria

- [ ] `vitest.config.ts` exists at project root.
- [ ] `npm run test:unit` runs and passes.
- [ ] At least 9 unit tests covering storageUtils and server-cache.
- [ ] Tests mock localStorage correctly (no real browser storage).
- [ ] TypeScript compiles without errors.
- [ ] Vitest listed in devDependencies.
