---
task_id: ARCH-031
target_agent: auto-feature-engineer-finite
target_module: src/middleware.ts
priority: critical
status: completed
---

# Add Security Headers Middleware

## Context

Pulse Radio currently ships **zero security headers**. The only security measure is `poweredByHeader: false` in `next.config.ts`. For an application that proxies arbitrary external audio streams and renders user-facing content from multiple third-party APIs (iTunes, MusicBrainz, Wikipedia, LrcLib, Bandsintown), this is a critical vulnerability surface. Without CSP, the app is susceptible to XSS injection via malicious station metadata. Without HSTS, users on HTTP can be MITM'd. Without X-Frame-Options, the app can be embedded in phishing frames.

At 100K+ users, this becomes an active attack surface.

## Directive

Create a Next.js middleware file at `src/middleware.ts` that injects the following security headers on every response:

1. **Content-Security-Policy**: Restrict `script-src` to `'self'`; allow `img-src` from known domains (iTunes artwork CDN `is*.mzstatic.com`, Radio Browser favicons `www.radio-browser.info`, Wikipedia images `upload.wikimedia.org`); allow `connect-src` to the known API domains; allow `media-src *` (for audio streams); use `style-src 'self' 'unsafe-inline'` (Tailwind requires inline); block `frame-ancestors 'self'`.
2. **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload`
3. **X-Content-Type-Options**: `nosniff`
4. **X-Frame-Options**: `SAMEORIGIN`
5. **Referrer-Policy**: `strict-origin-when-cross-origin`
6. **Permissions-Policy**: Disable `camera`, `microphone` (except for Web Speech API — check if needed), `geolocation`, `payment`. Allow `autoplay` (audio playback).

**Boundaries:**
- Do NOT modify any existing API route handlers.
- Use Next.js middleware pattern (`NextResponse.next()` with headers).
- CSP must NOT break existing functionality — test that iTunes artwork, Radio Browser favicons, lyrics fetches, and audio streams all still work.
- If the project already has a `middleware.ts`, extend it; do not overwrite.

## Acceptance Criteria

- [x] `src/middleware.ts` exists and applies headers to all routes.
- [x] CSP header present on page responses (verify via browser DevTools → Network → Response Headers).
- [x] Audio streaming still works (proxy-stream not blocked by CSP).
- [x] iTunes album artwork still loads.
- [x] No console CSP violation errors during normal usage.
- [x] HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy all present.
- [x] All existing Playwright tests pass after the change.
