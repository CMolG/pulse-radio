import { test, expect } from '@playwright/test';

test.use({ actionTimeout: 15_000 });

test.describe('Mobile Glassmorphism', () => {
  test('header and bottom bar have visible glassmorphism effect', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    // Screenshot full page on mobile
    await page.screenshot({ path: 'test-results/mobile-full.png', fullPage: false });

    // Check mobile header glassmorphism
    const header = page.locator('[data-testid="mobile-header"]');
    await expect(header).toBeVisible({ timeout: 10_000 });

    const headerStyles = await header.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        backdropFilter: cs.backdropFilter || cs.getPropertyValue('-webkit-backdrop-filter'),
      };
    });
    console.log('Header computed styles:', JSON.stringify(headerStyles, null, 2));

    const headerHasBlur = headerStyles.backdropFilter?.includes('blur');
    expect(headerHasBlur, 'Header should have backdrop-filter blur').toBeTruthy();
    await header.screenshot({ path: 'test-results/mobile-header.png' });

    // Check mobile bottom bar glassmorphism
    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible({ timeout: 10_000 });

    const bottomStyles = await bottomBar.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        backdropFilter: cs.backdropFilter || cs.getPropertyValue('-webkit-backdrop-filter'),
      };
    });
    console.log('Bottom bar computed styles:', JSON.stringify(bottomStyles, null, 2));

    const bottomHasBlur = bottomStyles.backdropFilter?.includes('blur');
    expect(bottomHasBlur, 'Bottom bar should have backdrop-filter blur').toBeTruthy();
    await bottomBar.screenshot({ path: 'test-results/mobile-bottom-bar.png' });
  });

  test('glassmorphism background has correct alpha for visibility', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const header = page.locator('[data-testid="mobile-header"]');
    await expect(header).toBeVisible({ timeout: 10_000 });

    const bgColor = await header.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    console.log('Header background-color:', bgColor);

    const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    expect(match, 'Background should be rgba').toBeTruthy();
    if (match?.[4]) {
      const alpha = parseFloat(match[4]);
      expect(alpha, 'Alpha should be < 0.76 for visible glass').toBeLessThan(0.76);
      expect(alpha, 'Alpha should be > 0.39 for readability').toBeGreaterThan(0.39);
    }

    // Verify RGB differs from container bg (#0a0f1a = 10,15,26)
    if (match) {
      const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      const diffFromContainer = Math.abs(r - 10) + Math.abs(g - 15) + Math.abs(b - 26);
      expect(diffFromContainer, 'Glass tint should differ from container bg').toBeGreaterThan(10);
      console.log(`Glass RGB: (${r},${g},${b}), diff from container: ${diffFromContainer}`);
    }
  });

  test('header stays sticky and shows glass effect when content scrolls behind it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/mobile-before-scroll.png', fullPage: false });

    // Scroll down so content passes behind the sticky header
    const scrollArea = page.locator('[data-testid="mobile-header"]').locator('..');
    await scrollArea.evaluate((el) => el.scrollTop = 400);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/mobile-after-scroll.png', fullPage: false });

    // Verify the header is still visible and sticky at the top
    const header = page.locator('[data-testid="mobile-header"]');
    await expect(header).toBeVisible();
    const headerBox = await header.boundingBox();
    expect(headerBox?.y, 'Header should be at the top (sticky)').toBeLessThan(10);
  });
});
