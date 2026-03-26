---
task_id: ARCH-028
target_agent: auto-visual-fixer
target_module: src/app/error.tsx
priority: medium
status: pending
---

# Add Root error.tsx Boundary for Graceful Error Recovery

## Context

The project has no `error.tsx` files in the App Router. Next.js 16 supports `error.tsx` as a built-in error boundary that catches rendering errors and displays a recovery UI. Currently, if a rendering error occurs outside the existing `ErrorBoundary` component (which only wraps `RadioShell`), users see a white screen or the default Next.js error page.

The project already has a well-designed `ErrorBoundary` class component at `src/components/radio/components/ErrorBoundary.tsx` that can serve as a design reference.

## Directive

1. Create `src/app/error.tsx` as a `'use client'` component (required by Next.js).
2. Design it to match the app's dark theme (`bg-[#0a0f1a]`, white text, glass effects).
3. Include:
   - Error icon (use lucide-react `AlertTriangle` or similar)
   - User-friendly error message (not the raw error stack)
   - A "Try again" button that calls the `reset()` function prop
   - A "Go home" link to `/`
4. Style it mobile-first (match the 390×844 viewport design rules).
5. Touch targets ≥ 44px on buttons.
6. Also create `src/app/[countryCode]/error.tsx` with the same design (or re-export the root one) for country route errors.
7. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `src/app/error.tsx` exists and is a valid error boundary
- [ ] `src/app/[countryCode]/error.tsx` exists
- [ ] Dark theme with glass effects matching app design
- [ ] "Try again" button calls `reset()` prop
- [ ] Mobile-first, touch targets ≥ 44px
- [ ] `npm run build` passes with zero errors
- [ ] Verified with Playwright test that simulates an error
