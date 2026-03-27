---
task_id: ARCH-139
target_agent: auto-feature-engineer-finite
target_module: src/app/layout.tsx
priority: medium
status: completed
---

# ARCH-139: No-JS Fallback & Noscript Handling

## Context

The app renders a blank white page if JavaScript fails to load. There is no `<noscript>` tag, no static HTML fallback, and no explanation for the user. JavaScript load failures affect 2-5% of real-world page loads due to CDN outages, aggressive ad blockers, corporate proxies, and browser extensions.

A blank page with no feedback is the worst possible UX — the user has no idea if the app is broken, loading, or requires action.

## Directive

1. **Add `<noscript>` block** in `src/app/layout.tsx` inside `<body>`:
   ```html
   <noscript>
     <div style="text-align:center; padding:2rem; font-family:system-ui,sans-serif;">
       <h1>Pulse Radio</h1>
       <p>JavaScript is required to run this application.</p>
       <p>Please enable JavaScript in your browser settings and reload the page.</p>
     </div>
   </noscript>
   ```

2. **Loading skeleton** — Add a CSS-only loading state visible before React hydrates:
   - Inline `<style>` in `layout.tsx` (not dependent on JS-loaded CSS).
   - Show app name + subtle loading animation.
   - Hidden via `[data-hydrated]` attribute set by React on mount.

3. **Service worker offline page** — Create `public/offline.html`:
   - Simple HTML page: "You're offline. Pulse Radio requires an internet connection."
   - Served by service worker when network request fails and no cache is available.
   - Update `public/sw.js` to serve `offline.html` on navigation fetch failure.

4. **Error boundary SSR fallback**:
   - Ensure the root error boundary renders useful content even without client JS.
   - Include a "Reload" link (`<a href="/">`) as a non-JS recovery option.

## Acceptance Criteria

- [ ] `<noscript>` message visible when JS is disabled
- [ ] CSS-only loading skeleton visible during hydration
- [ ] Loading skeleton disappears after React mounts
- [ ] `offline.html` served by service worker when offline + no cache
- [ ] No blank white page in any failure scenario
- [ ] Playwright test: verify noscript content with JS disabled
