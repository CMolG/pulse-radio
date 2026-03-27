---
task_id: ARCH-082
target_agent: auto-feature-engineer-finite
target_module: src/app/[countryCode]/opengraph-image.tsx
priority: medium
status: pending
---

# Add Dynamic Open Graph Image Generation for Country Pages

## Context

Pulse Radio has 249 country-specific pages (`/[countryCode]`) but uses a single static Open Graph image (`/android-chrome-512x512.png`) for all of them. When shared on Twitter, Facebook, WhatsApp, or iMessage:

- All 249 country pages show the same generic preview.
- No country name, flag, or localized branding in the social card.
- Click-through rates suffer because previews are indistinguishable.

Next.js supports dynamic OG image generation via `opengraph-image.tsx` using the `ImageResponse` API from `next/og`, which renders at build time (no runtime cost).

## Directive

1. **Create `src/app/[countryCode]/opengraph-image.tsx`**:
   ```typescript
   import { ImageResponse } from 'next/og';

   export const size = { width: 1200, height: 630 };
   export const contentType = 'image/png';

   export default async function OGImage({ params }: { params: { countryCode: string } }) {
     const country = getCountryName(params.countryCode);
     return new ImageResponse(
       <div style={{ /* full-bleed gradient background */ }}>
         <div style={{ /* country flag emoji or icon */ }}>{getFlagEmoji(params.countryCode)}</div>
         <div style={{ /* "Pulse Radio" branding */ }}>Pulse Radio</div>
         <div style={{ /* "Listen to radio in {Country}" */ }}>
           Listen to radio in {country}
         </div>
       </div>,
       { ...size }
     );
   }
   ```

2. **Design the OG image**:
   - Dark gradient background matching the app's `#0a0f1a` → `#1a1a2e` palette.
   - Large country flag emoji (or Unicode flag).
   - "Pulse Radio" in white, bold.
   - "Listen to radio in {Country Name}" as subtitle.
   - Radio wave/sound visualization graphic (CSS-only, no external assets).

3. **Add `generateStaticParams`** to pre-render all 249 country images at build time.

4. **Verify**: Share a country page URL on Twitter Card Validator or Facebook Debugger (or inspect the generated `<meta property="og:image">` tag).

**Boundaries:**
- Do NOT install external image libraries (Satori is built into Next.js).
- Do NOT use external fonts (use system fonts for OG images).
- Keep the image simple — it's a social preview, not a poster.
- Do NOT modify existing meta tags — this file auto-injects the OG image.

## Acceptance Criteria

- [ ] `src/app/[countryCode]/opengraph-image.tsx` exists.
- [ ] OG image shows country name and Pulse Radio branding.
- [ ] `<meta property="og:image">` tag auto-generated for each country page.
- [ ] `npm run build` passes (all 249 images pre-rendered).
- [ ] Image is 1200×630px PNG.
