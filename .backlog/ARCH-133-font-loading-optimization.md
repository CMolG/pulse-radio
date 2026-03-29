---
task_id: ARCH-133
target_agent: auto-optimizer-finite
target_module: src/app/layout.tsx
priority: medium
status: completed
---

# ARCH-133: Font Loading Optimization & FOUT Prevention

## Context

`src/app/layout.tsx` loads Geist Sans and Geist Mono via `next/font/google` but without explicit `display` strategy — defaulting to `font-display: auto` (browser-dependent, often `block` which causes invisible text). No font preloading, no explicit weight subsetting, and no fallback font stack defined in CSS beyond the variable reference.

This causes FOUT (Flash of Unstyled Text) or FOIT (Flash of Invisible Text) on first load, particularly noticeable on slow mobile connections.

## Directive

1. **Set `display: 'swap'`** on both font imports in `src/app/layout.tsx`:
   ```typescript
   const geistSans = Geist({
     variable: '--font-geist-sans',
     subsets: ['latin'],
     display: 'swap',
   });
   const geistMono = GeistMono({
     variable: '--font-geist-mono',
     subsets: ['latin'],
     display: 'swap',
   });
   ```

2. **Subset font weights** — If the app only uses Regular (400) and Bold (700), specify:
   ```typescript
   weight: ['400', '700'],
   ```
   Audit all `font-weight` usage in `globals.css` and components to determine actual weights used.

3. **Fallback font stack** — Update `globals.css` body rule:
   ```css
   font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
   ```

4. **Verify in Playwright**:
   - Take screenshot at load — confirm no invisible/unstyled text flash.
   - Compare font rendering before/after changes.

## Acceptance Criteria

- [x] `display: 'swap'` set on both Geist font imports
- [x] Font weights subsetted to only those used
- [x] Fallback font stack defined in CSS
- [x] No FOIT on first load (text visible immediately with fallback)
- [x] Playwright screenshot shows correct font rendering
- [x] No increase in layout shift (CLS) from font swap
