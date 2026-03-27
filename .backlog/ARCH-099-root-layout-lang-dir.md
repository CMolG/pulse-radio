---
task_id: ARCH-099
target_agent: auto-optimizer-finite
target_module: src/app/layout.tsx
priority: high
status: pending
---

# Sync Root Layout html[lang/dir] with Locale — Fix SSR Mismatch

## Context

The root layout hardcodes `lang="en" dir="ltr"` on the `<html>` element:

```tsx
// src/app/layout.tsx ~lines 99-102
<html lang="en" dir="ltr" ...>
```

The `LocaleProvider` later fixes this client-side via DOM manipulation:
```tsx
// src/context/LocaleContext.tsx ~lines 76-79
document.documentElement.lang = locale;
document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
```

**Problems:**
1. **Before JS hydration**, the page renders with `lang="en" dir="ltr"` — wrong for Arabic, Hebrew, Persian, Urdu users.
2. **Screen readers see `lang="en"`** initially and announce content in English voice.
3. **Search engines crawl `/ar/` with `lang="en"` in HTML** — violates hreflang consistency, SEO penalty.
4. **RTL layout shifts after hydration** — content reflows from LTR to RTL, causing CLS (Cumulative Layout Shift) spikes.
5. **Flash of wrong directionality** — Arabic users see text alignment flip after ~1 second.

## Directive

1. **Use the `[countryCode]` route param** to determine the locale at the layout level:
   - The route structure is `src/app/[countryCode]/page.tsx`.
   - Create or modify a layout at `src/app/[countryCode]/layout.tsx` that reads `params.countryCode` and derives the locale.

2. **Set `lang` and `dir` dynamically** in the server-rendered HTML:
   ```tsx
   // src/app/[countryCode]/layout.tsx
   export default async function CountryLayout({
     children,
     params,
   }: {
     children: React.ReactNode;
     params: Promise<{ countryCode: string }>;
   }) {
     const { countryCode } = await params;
     const locale = getLocaleFromCountry(countryCode);
     const dir = isRtlLocale(locale) ? 'rtl' : 'ltr';

     return (
       <html lang={locale} dir={dir}>
         <body>{children}</body>
       </html>
     );
   }
   ```

3. **Alternatively**, if the layout structure makes a nested `<html>` impossible, use `generateMetadata` or a `<script>` tag to set `lang`/`dir` before first paint:
   ```tsx
   // Inline script approach (runs before React hydration)
   <script dangerouslySetInnerHTML={{ __html: `
     document.documentElement.lang = "${locale}";
     document.documentElement.dir = "${dir}";
   ` }} />
   ```

4. **Keep the `LocaleProvider` DOM manipulation** as a fallback for client-side locale changes (user switches language in settings).

5. **Remove the hardcoded `lang="en" dir="ltr"`** from the root layout.

**Boundaries:**
- Do NOT change the locale detection logic — only where the `<html>` attributes are set.
- Do NOT break the root layout for the default (no country code) route.
- Ensure the approach works with Next.js static generation (ISR/SSG).
- Test with both LTR (English, Spanish) and RTL (Arabic, Hebrew) locales.

## Acceptance Criteria

- [ ] `<html lang>` matches the country/locale from first byte (SSR, no JS required).
- [ ] `<html dir>` is `rtl` for Arabic/Hebrew/Persian/Urdu pages from first byte.
- [ ] No layout shift (CLS) when locale is RTL.
- [ ] Screen readers announce correct language immediately.
- [ ] Search engine crawler sees correct `lang` attribute.
- [ ] `npm run build` passes.
- [ ] Playwright test: `/ar/` page has `lang="ar" dir="rtl"` in initial HTML.
