---
task_id: ARCH-122
target_agent: auto-optimizer-finite
target_module: public/robots.txt
priority: low
status: completed
---

# ARCH-122: Block API Routes in robots.txt & SEO Hardening

## Context

The current `robots.txt` allows all paths. This means search engine crawlers can (and will) hit `/api/itunes`, `/api/artist-info`, `/api/concerts`, `/api/icy-meta`, and `/api/proxy-stream`. These endpoints are rate-limited by upstream providers, so crawler traffic:

1. **Wastes API quota** — Googlebot sends thousands of requests to discover and index API routes.
2. **Returns JSON, not HTML** — Search engines can't meaningfully index JSON responses.
3. **May trigger rate limits** — Excessive crawler requests to `/api/itunes` could get the app's IP rate-limited by Apple.

Additionally, the root layout has minor SEO gaps: missing `og:image:type` and apple status bar fallback meta.

## Directive

1. **Update `public/robots.txt`**:
   ```
   User-agent: *
   Allow: /
   Disallow: /api/
   Disallow: /_next/

   Sitemap: https://www.pulse-radio.online/sitemap.xml
   ```

2. **Verify sitemap URL** matches the actual deployed domain.

3. **Add minor SEO meta enhancements to `src/app/layout.tsx`** (if not already present):
   - Add `og:image:type: 'image/png'` to the Open Graph config.
   - Ensure `apple-mobile-web-app-status-bar-style` meta tag is present (may be handled by Next.js metadata API already — verify).

4. **Do NOT modify any API route behavior** — only the robots.txt and SEO metadata.

## Acceptance Criteria

- [ ] `robots.txt` blocks `/api/` and `/_next/` paths
- [ ] Sitemap URL in robots.txt is correct
- [ ] `og:image:type` present in layout metadata
- [ ] No functional changes — all Playwright tests pass
