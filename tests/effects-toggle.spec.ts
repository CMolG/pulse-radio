import { test, expect } from "@playwright/test";

/**
 * Helper: dismiss welcome modal, then select a station so the bottom bar appears.
 */
async function selectStation(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // Dismiss welcome modal if present
  const skipBtn = page.getByText("Skip");
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }

  const stationCards = page.locator('[role="button"][aria-label]');
  const count = await stationCards.count();
  if (count === 0) return false;

  await stationCards.first().click();
  await page.waitForTimeout(4000);
  return true;
}

test.describe("Effects toggle (direct streaming by default)", () => {
  test("effects toggle button exists in compact bottom bar", async ({
    page,
  }) => {
    const loaded = await selectStation(page);
    if (!loaded) {
      test.skip(true, "No stations loaded");
      return;
    }

    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    const effectsBtn = bottomBar.locator(
      'button[aria-label="Enable audio effects"]'
    );
    await expect(effectsBtn).toBeVisible();
  });

  test("effects are disabled by default (aria-pressed=false)", async ({
    page,
  }) => {
    const loaded = await selectStation(page);
    if (!loaded) {
      test.skip(true, "No stations loaded");
      return;
    }

    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    const effectsBtn = bottomBar.locator(
      'button[aria-label="Enable audio effects"]'
    );
    await expect(effectsBtn).toBeVisible();
    await expect(effectsBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("EQ button is hidden when effects are disabled", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Dismiss welcome modal if present
    const skipBtn = page.locator('button:has-text("Skip")');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    const stationCards = page.locator('[role="button"][aria-label]');
    const count = await stationCards.count();
    if (count === 0) {
      test.skip(true, "No stations loaded");
      return;
    }
    await stationCards.first().click();
    await page.waitForTimeout(4000);

    // The EQ toggle should not be visible (effects are off by default)
    const eqBtn = page.locator('button[aria-label="Toggle equalizer"]');
    await expect(eqBtn).toHaveCount(0);
  });

  test("clicking effects button toggles aria-pressed", async ({ page }) => {
    const loaded = await selectStation(page);
    if (!loaded) {
      test.skip(true, "No stations loaded");
      return;
    }

    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    const effectsBtn = bottomBar.locator(
      'button[aria-label="Enable audio effects"]'
    );
    await expect(effectsBtn).toHaveAttribute("aria-pressed", "false");

    await effectsBtn.click();
    await page.waitForTimeout(500);

    // After clicking, label changes and aria-pressed becomes true
    const disableBtn = bottomBar.locator(
      'button[aria-label="Disable audio effects"]'
    );
    await expect(disableBtn).toBeVisible();
    await expect(disableBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("audio plays direct without proxy when effects are off", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Intercept proxy requests to verify none are made
    let proxyUsed = false;
    await page.route("**/api/proxy-stream**", (route) => {
      proxyUsed = true;
      route.continue();
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Dismiss welcome modal if present
    const skipBtn = page.getByText("Skip");
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    const stationCards = page.locator('[role="button"][aria-label]');
    const count = await stationCards.count();
    if (count === 0) {
      test.skip(true, "No stations loaded");
      return;
    }

    await stationCards.first().click();
    await page.waitForTimeout(4000);

    const audioSrc = await page.evaluate(() => {
      const audio = document.querySelector("audio");
      return audio?.src || null;
    });

    // Audio should NOT go through proxy when effects are disabled
    if (audioSrc) {
      expect(audioSrc).not.toContain("/api/proxy-stream");
      expect(proxyUsed).toBe(false);
    }
  });
});
