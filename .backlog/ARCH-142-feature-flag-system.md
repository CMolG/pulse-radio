---
task_id: ARCH-142
target_agent: auto-feature-engineer-finite
target_module: src/lib/feature-flags.ts
priority: medium
status: completed
---

# ARCH-142: Feature Flag System

## Context

Multiple cards reference feature flags via `NEXT_PUBLIC_*` environment variables but no centralized system exists to manage them:
- ARCH-129 (error reporting): `NEXT_PUBLIC_ERROR_REPORTING=true`
- ARCH-136 (analytics): `NEXT_PUBLIC_ANALYTICS=true`
- ARCH-134 (cloud sync): implicitly needs `NEXT_PUBLIC_AUTH_ENABLED`

Without a shared system, each card will independently read `process.env`, leading to inconsistent naming, no defaults, and no type safety.

ARCH-110 (runtime env validation) covers required server-side variables. This card covers **optional client-side feature toggles** — a complementary concern.

## Directive

1. **Create `src/lib/feature-flags.ts`**:
   ```typescript
   export const flags = {
     errorReporting: process.env.NEXT_PUBLIC_ERROR_REPORTING === 'true',
     analytics: process.env.NEXT_PUBLIC_ANALYTICS === 'true',
     authEnabled: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',
     debugMode: process.env.NEXT_PUBLIC_DEBUG === 'true',
   } as const;

   export type FeatureFlag = keyof typeof flags;
   export function isEnabled(flag: FeatureFlag): boolean;
   ```

2. **Runtime override** (development only):
   - Check `localStorage.getItem('ff_override_<flag>')` in development mode.
   - Allow developers to toggle flags without restarting the dev server.
   - Disabled in production builds.

3. **Documentation** — Update `.env.example` (from ARCH-069) with all feature flag variables and their defaults.

4. **Guard helper** for conditional rendering:
   ```typescript
   export function withFlag<P>(flag: FeatureFlag, Component: React.FC<P>): React.FC<P>;
   ```
   Returns null if flag is disabled, renders component if enabled.

## Acceptance Criteria

- [ ] `flags` object provides typed boolean access to all feature flags
- [ ] `isEnabled()` function works for runtime checks
- [ ] Development-mode localStorage override works
- [ ] Overrides disabled in production
- [ ] `.env.example` documents all feature flag variables
- [ ] `withFlag` HOC conditionally renders components
- [ ] All flags default to `false` when env var is unset
