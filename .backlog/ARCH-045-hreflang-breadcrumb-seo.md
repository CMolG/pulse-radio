---
task_id: ARCH-045
target_agent: auto-feature-engineer-finite
target_module: src/app/layout.tsx
priority: medium
status: completed
---

# Add Hreflang Tags & Breadcrumb Schema for SEO

## Context

Pulse Radio supports 36 languages and 249 country pages, but has zero hreflang tags in its metadata. Search engines cannot discover language variants of pages. A user searching in German won't be served the `/de` page variant because Google doesn't know it exists in German. Additionally, the 249 country pages lack breadcrumb structured data (JSON-LD), which reduces rich snippet eligibility in search results.

For a site with 250+ pages across 36 languages, hreflang is critical for international SEO. Without it, Google may treat country pages as duplicate content.

## Directive

1. **Add hreflang alternate links** to the `generateMetadata()` function in `src/app/[countryCode]/page.tsx`:
   - For each country page, generate `alternates.languages` entries mapping each supported locale to the same country URL.
   - Use the format: `{ 'en': '/us', 'es': '/us', 'fr': '/us', ... }` (same URL, different language declarations).
   - Add an `x-default` entry pointing to the canonical URL.
   - Reference the project's `SUPPORTED_LOCALES` list for the language codes.

2. **Add BreadcrumbList schema** to country pages:
   - Insert JSON-LD `BreadcrumbList` structured data in the country page layout or `generateMetadata()`.
   - Breadcrumb structure: `Home > [Country Name]`
   - Example:
     ```json
     {
       "@context": "https://schema.org",
       "@type": "BreadcrumbList",
       "itemListElement": [
         { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://pulseradio.app/" },
         { "@type": "ListItem", "position": 2, "name": "United States", "item": "https://pulseradio.app/us" }
       ]
     }
     ```

3. **Add `searchAction` to existing WebApplication schema** in root layout:
   - Add `potentialAction` with `SearchAction` type pointing to the station search functionality.

**Boundaries:**
- Do NOT modify the page rendering logic — only metadata and structured data.
- Do NOT create new pages or routes.
- Use Next.js Metadata API (`alternates.languages`) — do NOT use `<link>` tags directly.
- Breadcrumb data should use country names from the existing `SOVEREIGN_COUNTRY_CODES` mapping.

## Acceptance Criteria

- [ ] Country pages have hreflang alternate links in HTML `<head>`.
- [ ] `x-default` hreflang points to canonical URL.
- [ ] BreadcrumbList JSON-LD present on all 249 country pages.
- [ ] SearchAction added to WebApplication schema on root layout.
- [ ] Google Rich Results Test validates the breadcrumb schema.
- [ ] `npm run build` passes (SSG for all 249 pages still works).
- [ ] No duplicate or conflicting metadata tags.
