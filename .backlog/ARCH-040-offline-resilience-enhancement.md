---
task_id: ARCH-040
target_agent: auto-feature-engineer-finite
target_module: public/sw.js
priority: medium
status: pending
---

# Enhance PWA Offline Resilience

## Context

Pulse Radio has a basic service worker (`public/sw.js`) and an `offline.html` fallback page, but the offline experience is minimal. The current service worker likely only serves the offline page when the network is unavailable. For a radio app that users rely on during commutes (tunnels, spotty cell coverage), the offline experience should be much richer:

1. **App shell should load offline** — cached HTML/JS/CSS so the UI renders instantly.
2. **Last-played station metadata should persist** — show what was playing before going offline.
3. **In-app offline indicator** — users should know they're offline, not just see a blank screen.
4. **Favorites and history should be accessible offline** — these are already in localStorage.

## Directive

1. **Enhance `public/sw.js`**:
   - Implement **Cache-First** strategy for static assets (JS, CSS, fonts, icons).
   - Implement **Network-First** strategy for API routes (try network, fall back to cache).
   - **Pre-cache** the app shell on install: `/`, key JS bundles, CSS, and the offline page.
   - Set a max cache age of 7 days for static assets.
   - Cache API responses for `/api/itunes`, `/api/lyrics`, `/api/artist-info` with a 24-hour expiry.
   - Do NOT cache `/api/proxy-stream` or `/api/icy-meta` (streaming data).

2. **Create `src/hooks/useOnlineStatus.ts`**:
   - Hook that returns `{ isOnline: boolean, wasOffline: boolean }`.
   - Uses `navigator.onLine` + `online`/`offline` event listeners.
   - `wasOffline` becomes true after a reconnection (for showing "Back online" toast).
   - Resets `wasOffline` after 5 seconds.

3. **Update `src/components/radio/components/ServiceWorkerRegistrar`** (or wherever SW registration happens):
   - Register the enhanced service worker with proper update flow.
   - Handle `updatefound` event to notify user of new version.

**Boundaries:**
- Do NOT modify RadioShell.tsx — offline indicator UI will be a separate visual-fixer card.
- Do NOT use Workbox or any npm package — keep the service worker vanilla JS.
- Do NOT cache audio streams — only app shell and metadata API responses.
- The service worker must not break existing functionality when online.

## Acceptance Criteria

- [ ] Service worker pre-caches app shell assets on install.
- [ ] Static assets use Cache-First strategy.
- [ ] API responses (except streaming) use Network-First with cache fallback.
- [ ] `useOnlineStatus` hook correctly detects online/offline transitions.
- [ ] App shell renders when fully offline (airplane mode test).
- [ ] Cached station metadata is displayed when offline.
- [ ] No errors in service worker lifecycle (install, activate, fetch).
- [ ] All existing Playwright tests pass (service worker should be transparent).
