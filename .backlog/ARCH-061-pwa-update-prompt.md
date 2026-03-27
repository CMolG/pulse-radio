---
task_id: ARCH-061
target_agent: auto-feature-engineer-finite
target_module: src/components/radio/components/ServiceWorkerRegistrar.tsx
priority: critical
status: pending
---

# Add PWA Update Prompt — Users Are Stuck on Stale Versions

## Context

Pulse Radio registers a service worker (`public/sw.js`) for PWA support, but there is NO update detection or prompt mechanism. When the app is updated and deployed:

1. The service worker caches the old version indefinitely.
2. Users who installed the PWA never receive the new version.
3. There is no "new version available" prompt.
4. Bug fixes, security patches, and new features never reach PWA users.

This is a production-critical gap — users on the stale version may experience bugs that have already been fixed, and there's no mechanism to push updates.

## Directive

1. **Enhance `ServiceWorkerRegistrar`** (or create if minimal):
   - On `updatefound` event, detect when a new service worker is `installed`.
   - If an existing controller is active (meaning this is an UPDATE, not first install):
     - Show a non-blocking toast/banner: "A new version is available. Tap to update."
     - On user tap, send `SKIP_WAITING` message to the new worker.
   - On `controllerchange` event (after skip waiting), reload the page.

2. **Add `SKIP_WAITING` handler** to `public/sw.js`:
   ```javascript
   self.addEventListener('message', (event) => {
     if (event.data?.type === 'SKIP_WAITING') {
       self.skipWaiting();
     }
   });
   ```

3. **Periodic update check**: Call `registration.update()` every 60 seconds while the app is open, so users don't have to close and reopen to detect updates.

4. **Prevent refresh loop**: Use a `refreshing` flag to ensure `controllerchange` only triggers one reload.

**Boundaries:**
- Do NOT modify the service worker's cache strategy (that's ARCH-040).
- Do NOT force-reload without user confirmation — always show a prompt first.
- The update toast should follow the existing toast/notification pattern in the app.
- Do NOT add npm dependencies.

## Acceptance Criteria

- [ ] New service worker versions are detected via `updatefound` event.
- [ ] User sees a "New version available" prompt when an update is ready.
- [ ] Tapping the prompt triggers `skipWaiting()` and page reload.
- [ ] `registration.update()` runs every 60 seconds.
- [ ] No refresh loops (guarded by `refreshing` flag).
- [ ] `public/sw.js` handles `SKIP_WAITING` message.
- [ ] `npm run build` passes.
