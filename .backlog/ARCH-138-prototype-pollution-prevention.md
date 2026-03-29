---
task_id: ARCH-138
target_agent: auto-optimizer-finite
target_module: src/lib/sanitize.ts
priority: medium
status: completed
---

# ARCH-138: Prototype Pollution Prevention in JSON Deserialization

## Context

The app deserializes JSON from multiple untrusted sources: Radio Browser API station data, localStorage (user-modifiable), and ICY metadata streams. If any of these sources include keys like `__proto__`, `constructor`, or `prototype`, they could pollute Object prototypes and enable XSS or privilege escalation.

ARCH-034 (input sanitization) covers XSS injection but not prototype pollution. ARCH-076 (Zod station validation) will enforce schemas on station data but doesn't strip dangerous keys pre-parse. ARCH-128 (API validation) covers request inputs, not response deserialization.

## Directive

1. **Create `src/lib/sanitize.ts`** (or extend if it exists):
   - `stripPrototypeKeys(obj)`: recursively remove `__proto__`, `constructor`, `prototype` keys from any parsed JSON object.
   - `safeJsonParse(text)`: wrapper around `JSON.parse` that applies `stripPrototypeKeys` to the result.

2. **Apply to all JSON deserialization points**:
   - Radio Browser API responses in `/api/cron/sync/route.ts`.
   - ICY metadata parsing in `/api/icy-meta/route.ts`.
   - localStorage reads in `src/lib/storageUtils.ts`.
   - Any `JSON.parse()` of external data across the codebase.

3. **Freeze Object.prototype** (optional defense-in-depth):
   - Add `Object.freeze(Object.prototype)` in app initialization if it doesn't break third-party libraries.
   - Test thoroughly — some libraries mutate prototypes.

4. **Test**:
   - Unit test: `safeJsonParse('{"__proto__":{"polluted":true}}')` should not pollute `({}).polluted`.
   - Verify existing functionality not broken by key stripping.

## Acceptance Criteria

- [ ] `stripPrototypeKeys` removes `__proto__`, `constructor`, `prototype` from nested objects
- [ ] `safeJsonParse` wraps all external JSON parsing
- [ ] Radio Browser API responses sanitized before storage
- [ ] ICY metadata sanitized before client delivery
- [ ] localStorage reads sanitized on deserialization
- [ ] Unit test confirms no prototype pollution
