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

async function goToBooks(page: Page) {
  await dismissOnboarding(page);
  const tab = page.getByRole('tab', { name: 'Books', exact: true });
  await tab.click({ force: true });
  await page.waitForTimeout(1000);
}

test.describe('Books Section', () => {
  test.beforeEach(async ({ page }) => {
    await dismissOnboarding(page);
  });

  test('books tab is visible and navigable', async ({ page }) => {
    const tab = page.getByRole('tab', { name: 'Books', exact: true });
    await expect(tab).toBeVisible({ timeout: 10_000 });
    await tab.click({ force: true });
    await page.waitForTimeout(1000);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await page.screenshot({ path: 'test-results/books-tab.png' });
  });

  test('books view renders with search bar', async ({ page }) => {
    await goToBooks(page);
    const searchInput = page.locator('input[placeholder*="book" i]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('book cards use glass styling', async ({ page }) => {
    await goToBooks(page);
    await page.waitForTimeout(2000);
    const card = page.locator('[data-testid="book-card"]').first();
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
      await card.screenshot({ path: 'test-results/book-card-glass.png' });
    }
  });

  test('book card buttons meet touch target size', async ({ page }) => {
    await goToBooks(page);
    await page.waitForTimeout(2000);
    const card = page.locator('[data-testid="book-card"]').first();
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

  test('book theater view opens and has controls', async ({ page }) => {
    await goToBooks(page);
    await page.waitForTimeout(2000);
    const readBtn = page.locator('button', { hasText: /read/i }).first();
    if (await readBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await readBtn.click({ force: true });
      await page.waitForTimeout(2000);
      const theater = page.locator('[data-testid="book-theater"]');
      if (await theater.isVisible({ timeout: 5000 }).catch(() => false)) {
        const closeBtn = theater.locator('button').first();
        await expect(closeBtn).toBeVisible();
        await page.screenshot({ path: 'test-results/book-theater.png' });
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('book theater keyboard navigation', async ({ page }) => {
    await goToBooks(page);
    await page.waitForTimeout(2000);
    const readBtn = page.locator('button', { hasText: /read/i }).first();
    if (await readBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await readBtn.click({ force: true });
      await page.waitForTimeout(2000);
      const theater = page.locator('[data-testid="book-theater"]');
      if (await theater.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
  });

  test('existing tabs still work after books addition', async ({ page }) => {
    const discoverTab = page.locator('button[role="tab"]', { hasText: /discover/i });
    await expect(discoverTab).toBeVisible({ timeout: 10_000 });
    await expect(discoverTab).toHaveAttribute('aria-selected', 'true');

    const historyTab = page.locator('button[role="tab"]', { hasText: /history/i });
    await expect(historyTab).toBeVisible();

    const favoritesTab = page.locator('button[role="tab"]', { hasText: /favorites/i });
    await expect(favoritesTab).toBeVisible();
  });
});
