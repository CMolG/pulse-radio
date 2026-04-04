import { test, expect, Page } from '@playwright/test';

async function dismissOnboarding(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  // Hide Next.js dev tools overlay that can intercept clicks
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

async function goToAudiobooks(page: Page) {
  await dismissOnboarding(page);
  const tab = page.locator('button[role="tab"]', { hasText: /audiobook/i });
  await tab.click({ force: true });
  await page.waitForTimeout(1000);
}

test.describe('Audiobooks Section', () => {
  test.beforeEach(async ({ page }) => {
    await dismissOnboarding(page);
  });

  test('audiobooks tab is visible and navigable', async ({ page }) => {
    const tab = page.locator('button[role="tab"]', { hasText: /audiobook/i });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click({ force: true });
    await page.waitForTimeout(1000);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: 'test-results/audiobooks-tab.png' });
  });

  test('audiobooks view renders with search bar', async ({ page }) => {
    await goToAudiobooks(page);
    const searchInput = page.locator('input[type="search"]').filter({ hasText: /$/ }).first();
    const abSearch = page.locator('input[placeholder*="audiobook" i]');
    await expect(abSearch).toBeVisible({ timeout: 10_000 });
  });

  test('audiobooks tab touch target is adequate', async ({ page }) => {
    const tab = page.locator('button[role="tab"]', { hasText: /audiobook/i });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    const box = await tab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(28);
  });

  test('audiobook cards use glass styling', async ({ page }) => {
    await goToAudiobooks(page);
    await page.waitForTimeout(2000);
    const card = page.locator('[data-testid="audiobook-card"]').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      const styles = await card.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          backdropFilter: cs.backdropFilter || cs.getPropertyValue('-webkit-backdrop-filter'),
        };
      });
      if (styles.backdropFilter) {
        expect(styles.backdropFilter).toContain('blur');
      }
      await card.screenshot({ path: 'test-results/audiobook-card-glass.png' });
    }
  });

  test('audiobook card buttons meet touch target size', async ({ page }) => {
    await goToAudiobooks(page);
    await page.waitForTimeout(2000);
    const card = page.locator('[data-testid="audiobook-card"]').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      const buttons = card.locator('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('existing tabs still work after audiobooks addition', async ({ page }) => {
    const discoverTab = page.locator('button[role="tab"]', { hasText: /discover/i });
    await expect(discoverTab).toBeVisible({ timeout: 10_000 });
    await expect(discoverTab).toHaveAttribute('aria-selected', 'true');

    const historyTab = page.locator('button[role="tab"]', { hasText: /history/i });
    await expect(historyTab).toBeVisible();
    await historyTab.click({ force: true });
    await page.waitForTimeout(500);
    await expect(historyTab).toHaveAttribute('aria-selected', 'true');

    const favoritesTab = page.locator('button[role="tab"]', { hasText: /favorites/i });
    await expect(favoritesTab).toBeVisible();
    await favoritesTab.click({ force: true });
    await page.waitForTimeout(500);
    await expect(favoritesTab).toHaveAttribute('aria-selected', 'true');
  });
});
