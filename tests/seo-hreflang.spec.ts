import { test, expect } from '@playwright/test';

test.describe('Hreflang & Breadcrumb SEO (ARCH-045)', () => {
  test('country page has hreflang alternate links', async ({ page }) => {
    await page.goto('/US');
    const html = await page.content();
    // Should have x-default hreflang
    expect(html).toContain('hreflang="x-default"');
    // Should have at least one language-specific hreflang
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="es"');
  });

  test('country page has BreadcrumbList JSON-LD', async ({ page }) => {
    await page.goto('/US');
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent || '');
          if (data['@type'] === 'BreadcrumbList') return data;
        } catch {}
      }
      return null;
    });
    expect(jsonLd).not.toBeNull();
    expect(jsonLd['@type']).toBe('BreadcrumbList');
    expect(jsonLd.itemListElement).toHaveLength(2);
    expect(jsonLd.itemListElement[0].name).toBe('Home');
    expect(jsonLd.itemListElement[1].name).toBe('United States');
  });

  test('root layout has SearchAction in WebApplication schema', async ({ page }) => {
    await page.goto('/');
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent || '');
          if (data['@type'] === 'WebApplication') return data;
        } catch {}
      }
      return null;
    });
    expect(jsonLd).not.toBeNull();
    expect(jsonLd.potentialAction).toBeDefined();
    expect(jsonLd.potentialAction['@type']).toBe('SearchAction');
  });

  test('different country page has correct breadcrumb', async ({ page }) => {
    await page.goto('/DE');
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          const data = JSON.parse(s.textContent || '');
          if (data['@type'] === 'BreadcrumbList') return data;
        } catch {}
      }
      return null;
    });
    expect(jsonLd).not.toBeNull();
    expect(jsonLd.itemListElement[1].name).toBe('Germany');
  });
});
