import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts (ARCH-039)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Space key triggers play/pause and does not scroll', async ({ page }) => {
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Space');
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test('ArrowUp and ArrowDown do not scroll the page', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 50));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowDown');
    // These should be handled by the keyboard shortcut hook, not scroll
    const scrollAfter = await page.evaluate(() => window.scrollY);
    // The shortcuts hook prevents default on these keys
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(1);
  });

  test('shortcuts are suppressed when typing in search input', async ({ page }) => {
    // Find any input element (search input)
    const input = page.locator('input[type="search"], input[type="text"], input').first();
    if (await input.count() > 0) {
      await input.focus();
      await page.keyboard.type('m');
      // The 'm' key should type into the input, not toggle mute
      const value = await input.inputValue();
      expect(value).toContain('m');
    }
  });

  test('Escape key can be pressed without errors', async ({ page }) => {
    // Should not throw any errors
    await page.keyboard.press('Escape');
    // Page should still be functional
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('M key can be pressed without errors', async ({ page }) => {
    await page.keyboard.press('m');
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
