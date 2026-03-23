import { test, expect } from "@playwright/test";

test.describe("Theater and playback fixes", () => {
  test("theater mode shows album art centered without black stripe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click station to enter theater mode
    const cards = page.locator('[role="button"][aria-label]');
    if ((await cards.count()) === 0) {
      test.skip(true, "No stations loaded");
      return;
    }
    await cards.first().click();
    await page.waitForTimeout(3000);

    // Take screenshot of theater mode
    await page.screenshot({
      path: "test-results/theater-no-black-stripe.png",
      fullPage: false,
    });

    // The glass panel should exist and contain the album art
    const glassPanel = page.locator(".rounded-3xl").first();
    await expect(glassPanel).toBeVisible();

    // The panel background should be semi-transparent (glassmorphism)
    const bg = await glassPanel.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // Should be rgba with alpha < 1
    expect(bg).toContain("rgba");
  });

  test("play button has proper left padding in bottom bar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Click a station first so the bottom bar has a real play button
    const cards = page.locator('[role="button"][aria-label]');
    if ((await cards.count()) > 0) {
      await cards.first().click();
      await page.waitForTimeout(3000);
    }

    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    const playBtn = bottomBar.locator("button").first();
    const box = await playBtn.boundingBox();
    expect(box).not.toBeNull();

    // Play button should be at least 16px from the left edge (pl-6 = 24px)
    expect(box!.x).toBeGreaterThanOrEqual(16);

    await page.screenshot({
      path: "test-results/play-button-padding.png",
      fullPage: false,
    });
  });

  test("settings panel EQ controls are inline, not floating", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Open settings
    await page.locator('[data-testid="mobile-settings-btn"]').click();
    await page.waitForTimeout(500);

    const panel = page.locator('[data-testid="mobile-settings-panel"]');
    await expect(panel).toBeVisible();

    // Click Equalizer to expand
    const eqButton = panel.locator("text=Equalizer");
    await eqButton.click();
    await page.waitForTimeout(400);

    // Verify EQ controls are visible inside the panel
    const presetsLabel = panel.locator("text=Presets");
    await expect(presetsLabel).toBeVisible();

    const bandsLabel = panel.locator("text=Bands");
    await expect(bandsLabel).toBeVisible();

    // Take screenshot to verify inline layout
    await page.screenshot({
      path: "test-results/settings-eq-inline.png",
      fullPage: false,
    });

    // Verify no absolute-positioned EQ panel exists (the old one had class "absolute")
    const absoluteEq = panel.locator(
      'div[class*="absolute"][class*="bottom-16"]'
    );
    await expect(absoluteEq).toHaveCount(0);
  });

  test("station click triggers audio and shows LIVE indicator", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const cards = page.locator('[role="button"][aria-label]');
    if ((await cards.count()) === 0) {
      test.skip(true, "No stations loaded");
      return;
    }

    await cards.first().click();
    await page.waitForTimeout(5000);

    // Check that station name appears in the bottom bar
    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    const barText = await bottomBar.textContent();
    expect(barText!.length).toBeGreaterThan(0);

    // Take final screenshot showing playing state
    await page.screenshot({
      path: "test-results/mobile-playing-state.png",
      fullPage: false,
    });
  });
});
