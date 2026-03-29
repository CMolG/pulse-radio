---
task_id: ARCH-121
target_agent: auto-feature-engineer-finite
target_module: public/site.webmanifest
priority: low
status: completed
---

# ARCH-121: PWA Manifest Enhancements — Screenshots, Shortcuts, Share Target

## Context

The current `site.webmanifest` is PWA-functional (display: standalone, icons, colors) but lacks three fields that improve the "Add to Home Screen" experience and enable native OS integrations:

1. **`screenshots`**: Chrome and Edge show a richer install UI with screenshots. Without them, the install prompt is generic.
2. **`shortcuts`**: PWA shortcuts appear on long-press of the app icon (Android) or in the dock menu (desktop). Users can jump directly to favorites, settings, or a random station.
3. **`share_target`**: Enables the app to receive shared URLs (e.g., a friend shares a station link from another app → Pulse Radio opens it directly).

## Directive

1. **Add `screenshots` field**:
   ```json
   "screenshots": [
     {
       "src": "/screenshots/mobile.png",
       "sizes": "390x844",
       "type": "image/png",
       "form_factor": "narrow",
       "label": "Pulse Radio mobile player"
     },
     {
       "src": "/screenshots/desktop.png",
       "sizes": "1280x800",
       "type": "image/png",
       "form_factor": "wide",
       "label": "Pulse Radio desktop view"
     }
   ]
   ```
   - Create placeholder screenshot images in `public/screenshots/` (can be replaced later with real screenshots).

2. **Add `shortcuts` field**:
   ```json
   "shortcuts": [
     {
       "name": "Favorites",
       "url": "/?tab=favorites",
       "icons": [{ "src": "/favicon-32x32.png", "sizes": "32x32" }]
     },
     {
       "name": "Random Station",
       "url": "/?action=random",
       "icons": [{ "src": "/favicon-32x32.png", "sizes": "32x32" }]
     }
   ]
   ```

3. **Add `share_target` field**:
   ```json
   "share_target": {
     "action": "/",
     "method": "GET",
     "params": {
       "url": "station"
     }
   }
   ```
   - This allows receiving shared URLs that contain station parameters.

4. **Add `orientation`**: `"portrait-primary"` (mobile-first app).

## Acceptance Criteria

- [ ] `site.webmanifest` includes `screenshots`, `shortcuts`, `share_target`, `orientation`
- [ ] Placeholder screenshot images exist in `public/screenshots/`
- [ ] Manifest validates via Chrome DevTools → Application → Manifest
- [ ] PWA install prompt shows screenshots (test in Chrome)
- [ ] Long-press on installed app icon shows shortcuts (test on Android)
