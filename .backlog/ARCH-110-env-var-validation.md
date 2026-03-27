---
task_id: ARCH-110
target_agent: auto-feature-engineer-finite
target_module: src/lib/env.ts
priority: high
status: pending
---

# ARCH-110: Runtime Environment Variable Validation

## Context

ARCH-069 creates `.env.example` documentation, but does **not** add runtime validation. Currently, if `CRON_SECRET` is missing, the `/api/cron/sync` endpoint silently accepts any request (the Bearer token check passes against `undefined`). This is a **silent security failure** — the most dangerous kind.

Environment variables should be validated at application startup with clear, fail-fast error messages. This prevents misconfigured deployments from reaching production.

## Directive

1. **Create `src/lib/env.ts`** — a centralized environment configuration module:
   ```typescript
   // Validate and export typed environment variables
   // Fails fast at import time if required vars are missing

   function requireEnv(key: string): string {
     const value = process.env[key];
     if (!value) {
       throw new Error(
         `Missing required environment variable: ${key}. ` +
         `See .env.example for documentation.`
       );
     }
     return value;
   }

   function optionalEnv(key: string, defaultValue: string): string {
     return process.env[key] || defaultValue;
   }

   export const env = {
     // Required in production only
     CRON_SECRET: process.env.NODE_ENV === 'production'
       ? requireEnv('CRON_SECRET')
       : process.env.CRON_SECRET || 'dev-secret',

     // Optional with defaults
     BANDSINTOWN_APP_ID: optionalEnv('BANDSINTOWN_APP_ID', 'js_1dhsfh3t4'),
     NEXT_PUBLIC_BASE_URL: optionalEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000'),
   } as const;
   ```

2. **Replace all `process.env.*` references** in API routes with imports from `src/lib/env.ts`:
   - `src/app/api/cron/sync/route.ts`: Replace `process.env.CRON_SECRET` → `env.CRON_SECRET`
   - `src/app/api/concerts/route.ts`: Replace `process.env.BANDSINTOWN_APP_ID` → `env.BANDSINTOWN_APP_ID`

3. **Startup validation**: The module should be imported in the root server layout or middleware so it runs at startup, not lazily on first API call.

4. **Type safety**: Export `env` as `const` so TypeScript knows the exact shape. No `string | undefined` — all values are guaranteed `string` after validation.

5. **Do NOT use external validation libraries** (no Zod, Joi, etc.) — keep it zero-dependency. The validation logic is simple enough for plain TypeScript.

## Acceptance Criteria

- [ ] `src/lib/env.ts` exists with centralized env var access
- [ ] Missing `CRON_SECRET` in production throws a clear error at startup
- [ ] Missing `CRON_SECRET` in development uses a fallback (no crash)
- [ ] All `process.env.*` references in API routes replaced with `env.*`
- [ ] TypeScript types are strict — no `string | undefined` on validated vars
- [ ] `npm run build` passes
- [ ] Existing Playwright tests pass (they run in development mode)
