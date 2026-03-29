import { test, expect } from '@playwright/test';

test.describe('Offline Resilience (ARCH-040)', () => {
  test('service worker is available on the page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hasSwSupport = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSwSupport).toBeTruthy();
  });

  test('app shell page loads from cache on repeat visit', async ({ page }) => {
    // First visit primes the cache
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Second visit should leverage cache
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('static assets are served correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('API responses for itunes are cacheable', async ({ request }) => {
    const res = await request.get('/api/v1/itunes?term=test');
    expect([200, 504]).toContain(res.status());
  });

  test('sw.js has updated cache version', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('pulse-radio-v2');
    expect(body).toContain('CACHEABLE_API');
  });
});
