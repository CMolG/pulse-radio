---
task_id: ARCH-077
target_agent: auto-optimizer-finite
target_module: next.config.ts
priority: medium
status: pending
---

# Enable Next.js Image Optimization

## Context

`next.config.ts` has `images: { unoptimized: true }`, which disables ALL image optimization:
- No WebP/AVIF conversion for modern browsers.
- No automatic `srcset` generation for responsive images.
- No on-demand image resizing.
- Station favicons (loaded 100+ per page from `radio-browser.info`) are served at full size.
- PWA icons (192×192, 512×512 PNG) are uncompressed.

On slow mobile connections (the primary use case for a radio PWA), unoptimized images compound bandwidth waste significantly when browsing 100+ station cards.

## Directive

1. **Enable image optimization** in `next.config.ts`:
   ```typescript
   images: {
     // Remove `unoptimized: true`
     remotePatterns: [
       { protocol: 'https', hostname: '**.radio-browser.info' },
       { protocol: 'https', hostname: 'is1-ssl.mzstatic.com' },  // iTunes artwork
       { protocol: 'https', hostname: 'images.sk-static.com' },  // Songkick
     ],
     formats: ['image/avif', 'image/webp'],
     deviceSizes: [390, 640, 750, 1080],  // Mobile-first breakpoints
     minimumCacheTTL: 86400,  // 24h cache for optimized images
   }
   ```

2. **Audit `<img>` and `<Image>` usage** in RadioShell.tsx:
   - Ensure station favicons use `width`/`height` props (required when optimization is on).
   - Add `sizes` prop where images are smaller than viewport width.
   - Keep `loading="lazy"` on below-the-fold images.

3. **Test that external images load correctly** — radio-browser.info favicons are HTTP, so may need `protocol: 'http'` in remotePatterns if HTTPS is not available.

4. **Measure impact**: Compare build output size before/after.

**Boundaries:**
- Do NOT install sharp manually (Next.js bundles it automatically).
- If enabling optimization causes build failures due to external image URLs, add appropriate `remotePatterns` rather than reverting.
- Do NOT change the visual appearance of images — only the delivery format.
- Test on mobile-chrome viewport to verify favicons still render correctly.

## Acceptance Criteria

- [ ] `unoptimized: true` removed from `next.config.ts`.
- [ ] `remotePatterns` configured for all external image domains.
- [ ] `formats` set to `['image/avif', 'image/webp']`.
- [ ] All station favicons render correctly in mobile viewport.
- [ ] `npm run build` passes.
- [ ] Playwright tests pass on mobile-chrome.
