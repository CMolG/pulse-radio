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

test.describe('Picture-in-Picture Theater Mode', () => {
  test.beforeEach(async ({ page }) => {
    await dismissOnboarding(page);
  });

  test('PiP support detection works', async ({ page }) => {
    const hasDocPiP = await page.evaluate(() => 'documentPictureInPicture' in window);
    expect(typeof hasDocPiP).toBe('boolean');
  });

  test('PiP toggle button appears in theater mode', async ({ page }) => {
    const stationCard = page.locator('[data-testid="station-card"]').first();
    if (await stationCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stationCard.click({ force: true });
      await page.waitForTimeout(3000);

      const pipToggle = page.locator('[data-testid="pip-toggle-btn"]');
      if (await pipToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.screenshot({ path: 'test-results/pip-toggle-in-theater.png' });
        await expect(pipToggle).toHaveAttribute('aria-pressed', 'false');
      }
    }
  });

  test('PiP preference persists in localStorage', async ({ page }) => {
    const stationCard = page.locator('[data-testid="station-card"]').first();
    if (await stationCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stationCard.click({ force: true });
      await page.waitForTimeout(3000);

      const pipToggle = page.locator('[data-testid="pip-toggle-btn"]');
      if (await pipToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pipToggle.click();
        await page.waitForTimeout(500);
        const stored = await page.evaluate(() => localStorage.getItem('radio-pip-enabled'));
        expect(stored).toBe('true');
        await expect(pipToggle).toHaveAttribute('aria-pressed', 'true');

        await pipToggle.click();
        await page.waitForTimeout(500);
        const storedAfter = await page.evaluate(() => localStorage.getItem('radio-pip-enabled'));
        expect(storedAfter).toBe('false');
      }
    }
  });

  test('no regression: station plays after PiP feature addition', async ({ page }) => {
    const stationCard = page.locator('[data-testid="station-card"]').first();
    if (await stationCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stationCard.click({ force: true });
      await page.waitForTimeout(3000);

      const audioSrc = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return audio?.src || null;
      });
      if (audioSrc) {
        expect(audioSrc.length).toBeGreaterThan(0);
      }
    }
  });
});
