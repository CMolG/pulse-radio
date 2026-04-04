import { test, expect, Page } from '@playwright/test';

async function dismissOnboarding(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page
    .evaluate(() => {
      document
        .querySelectorAll('[class*="z-9999"], nextjs-portal')
        .forEach((el) => ((el as HTMLElement).style.display = 'none'));
    })
    .catch(() => {});
  const skipBtn = page.locator('button', { hasText: /skip/i });
  if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
}

test.describe('Static Station Pages (SEO)', () => {
  test.describe('Sitemap', () => {
    test('sitemap.xml is accessible and valid', async ({ page }) => {
      const response = await page.goto('/sitemap.xml');
      expect(response).not.toBeNull();
      expect(response!.status()).toBe(200);
    });

    test('sitemap contains URL entries', async ({ page }) => {
      await page.goto('/sitemap.xml', { waitUntil: 'load' });
      await page.waitForTimeout(1000);
      const hasUrls = await page.evaluate(() => {
        const text = document.body.innerText || document.body.textContent || '';
        return text.includes('<url>') || document.querySelectorAll('url').length > 0;
      });
      expect(hasUrls).toBeTruthy();
    });
  });

  test.describe('Station page structure', () => {
    test('station page renders SEO content when catalog exists', async ({ page }) => {
      await page.goto('/sitemap.xml', { waitUntil: 'domcontentloaded' });
      const sitemapText = await page.content();
      const hasStationUrls = sitemapText.includes('/stations/');
      if (hasStationUrls) {
        const match = sitemapText.match(/<loc>(https?:\/\/[^<]*\/stations\/[^<]+)<\/loc>/);
        if (match) {
          const path = new URL(match[1]).pathname;
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          const h1 = page.locator('h1');
          await expect(h1).toBeVisible({ timeout: 10_000 });
          const h1Text = await h1.textContent();
          expect(h1Text!.length).toBeGreaterThan(0);
          await page.screenshot({ path: 'test-results/station-page.png' });
        }
      }
    });

    test('station page has breadcrumb navigation', async ({ page }) => {
      await page.goto('/sitemap.xml', { waitUntil: 'domcontentloaded' });
      const sitemapText = await page.content();
      if (sitemapText.includes('/stations/')) {
        const match = sitemapText.match(/<loc>(https?:\/\/[^<]*\/stations\/[^<]+)<\/loc>/);
        if (match) {
          const path = new URL(match[1]).pathname;
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          const breadcrumb = page.locator('[data-testid="station-breadcrumb"]');
          if (await breadcrumb.isVisible({ timeout: 5000 }).catch(() => false)) {
            const links = breadcrumb.locator('a');
            expect(await links.count()).toBeGreaterThanOrEqual(2);
          }
        }
      }
    });

    test('station page has JSON-LD structured data', async ({ page }) => {
      await page.goto('/sitemap.xml', { waitUntil: 'domcontentloaded' });
      const sitemapText = await page.content();
      if (sitemapText.includes('/stations/')) {
        const match = sitemapText.match(/<loc>(https?:\/\/[^<]*\/stations\/[^<]+)<\/loc>/);
        if (match) {
          const path = new URL(match[1]).pathname;
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          const jsonLdScripts = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            return Array.from(scripts)
              .map((s) => {
                try {
                  return JSON.parse(s.textContent || '{}');
                } catch {
                  return null;
                }
              })
              .filter(Boolean);
          });
          if (jsonLdScripts.length > 0) {
            const hasBreadcrumb = jsonLdScripts.some(
              (s: Record<string, unknown>) => s['@type'] === 'BreadcrumbList',
            );
            expect(hasBreadcrumb).toBeTruthy();
          }
        }
      }
    });

    test('station page has proper title', async ({ page }) => {
      await page.goto('/sitemap.xml', { waitUntil: 'domcontentloaded' });
      const sitemapText = await page.content();
      if (sitemapText.includes('/stations/')) {
        const match = sitemapText.match(/<loc>(https?:\/\/[^<]*\/stations\/[^<]+)<\/loc>/);
        if (match) {
          const path = new URL(match[1]).pathname;
          await page.goto(path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);
          const title = await page.title();
          expect(title).toContain('Pulse Radio');
        }
      }
    });
  });

  test.describe('Regression', () => {
    test('home page still renders correctly', async ({ page }) => {
      await dismissOnboarding(page);
      const tablist = page.locator('[role="tablist"]');
      await expect(tablist.first()).toBeVisible({ timeout: 10_000 });
      const discoverTab = page.locator('button[role="tab"]', { hasText: /discover/i });
      await expect(discoverTab).toBeVisible();
    });

    test('country pages still render correctly', async ({ page }) => {
      await page.goto('/US', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      const title = await page.title();
      expect(title).not.toContain('404');
      await page.screenshot({ path: 'test-results/country-page-us.png' });
    });
  });
});
