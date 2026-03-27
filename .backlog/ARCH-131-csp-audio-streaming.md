---
task_id: ARCH-131
target_agent: auto-feature-engineer-finite
target_module: src/middleware.ts
priority: critical
status: pending
---

# ARCH-131: CSP Fine-Tuning for Audio Streaming & External APIs

## Context

ARCH-031 creates the security headers middleware (CSP, HSTS, X-Frame-Options). However, Pulse Radio has specific CSP challenges that require careful policy tuning:
- Audio streams from arbitrary radio station URLs (`media-src` must allow all origins)
- Album art from iTunes CDN (`is*.mzstatic.com`), Wikipedia (`upload.wikimedia.org`)
- API connections to 5+ external services (LrcLib, Bandsintown, MusicBrainz, Wikipedia, iTunes, Radio Browser)
- Web Audio API visualizer may need `audio-worklet-src`
- Service worker (`sw.js`) has CSP implications for `worker-src`
- Inline styles from Tailwind CSS need `style-src 'unsafe-inline'` or nonce strategy

A wrong CSP policy will silently break audio playback or metadata display with no visible error — only a console warning.

Depends on: **ARCH-031** (middleware must exist first).

## Directive

1. **Define CSP policy** for Pulse Radio's specific needs:
   ```
   default-src 'self';
   script-src 'self';
   style-src 'self' 'unsafe-inline';
   img-src 'self' https: data:;
   media-src 'self' http: https: data: blob:;
   connect-src 'self' https://lrclib.net https://rest.bandsintown.com https://musicbrainz.org https://en.wikipedia.org https://itunes.apple.com https://www.radio-browser.info https://*.radio-browser.info;
   font-src 'self';
   worker-src 'self';
   frame-src 'none';
   object-src 'none';
   base-uri 'self';
   form-action 'self';
   report-uri /api/csp-report;
   ```

2. **CSP violation reporting endpoint** — Create `/api/csp-report/route.ts`:
   - Accept POST with `Content-Type: application/csp-report`.
   - Log violations with: `blocked-uri`, `violated-directive`, `document-uri`.
   - Rate-limit: max 100 reports per minute (prevent abuse).
   - Store in structured log format for monitoring.

3. **CSP testing**:
   - Add Playwright test that loads the app, plays a station, fetches lyrics/artwork.
   - Assert zero CSP violations in browser console.
   - Test with both `Report-Only` mode and enforcing mode.

4. **Deploy strategy**:
   - Start with `Content-Security-Policy-Report-Only` header.
   - After 1 week of zero violations, switch to enforcing `Content-Security-Policy`.
   - Document the switch procedure in the card's PR.

## Acceptance Criteria

- [ ] CSP policy covers all external domains the app connects to
- [ ] `media-src` allows arbitrary audio stream origins
- [ ] `connect-src` whitelists all 6+ external APIs
- [ ] CSP report endpoint receives and logs violations
- [ ] Playwright test confirms zero CSP violations during normal usage
- [ ] Policy deployed in Report-Only mode initially
- [ ] Audio playback, artwork, lyrics all work with CSP enforced
