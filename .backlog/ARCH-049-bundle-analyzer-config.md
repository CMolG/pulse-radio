---
task_id: ARCH-049
target_agent: auto-feature-engineer-finite
target_module: next.config.ts
priority: low
status: pending
---

# Configure Bundle Analyzer for Continuous Size Monitoring

## Context

`@next/bundle-analyzer` is installed as a dev dependency but not configured in `next.config.ts`. The project has no visibility into bundle size — there's no way to detect when a dependency import adds 50KB to the client bundle. For a PWA that targets mobile users on potentially slow connections, bundle size awareness is critical.

The current `next.config.ts` is only 17 lines with minimal configuration. Adding the bundle analyzer wrapper is trivial but impactful.

## Directive

1. **Configure the bundle analyzer** in `next.config.ts`:
   ```typescript
   import withBundleAnalyzer from '@next/bundle-analyzer';

   const analyzer = withBundleAnalyzer({
     enabled: process.env.ANALYZE === 'true',
   });

   export default analyzer(nextConfig);
   ```

2. **Add an npm script** in `package.json`:
   ```json
   "analyze": "ANALYZE=true npm run build"
   ```

3. **Add `.next/analyze/` to `.gitignore`** if not already ignored.

4. **Document usage** in a comment in `next.config.ts`:
   ```
   // Run `npm run analyze` to open bundle size visualization
   ```

**Boundaries:**
- Do NOT change any existing config values (reactCompiler, poweredByHeader, images).
- Do NOT run the analyzer as part of CI (it's a manual debugging tool).
- Ensure the analyzer import doesn't affect normal builds when `ANALYZE` is not set.

## Acceptance Criteria

- [ ] `next.config.ts` wraps config with `withBundleAnalyzer`.
- [ ] `npm run analyze` script exists in `package.json`.
- [ ] `ANALYZE=true npm run build` opens the bundle visualization.
- [ ] Normal `npm run build` (without ANALYZE) is unaffected.
- [ ] `.gitignore` excludes analyzer output.
