import { test, expect } from "@playwright/test";

test.describe("Mobile settings panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  });

  test("settings button exists in mobile header", async ({ page }) => {
    const settingsBtn = page.locator('[data-testid="mobile-settings-btn"]');
    await expect(settingsBtn).toBeVisible();
  });

  test("settings panel opens with language and EQ sections", async ({
    page,
  }) => {
    const settingsBtn = page.locator('[data-testid="mobile-settings-btn"]');
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const panel = page.locator('[data-testid="mobile-settings-panel"]');
    await expect(panel).toBeVisible();

    // Should show "Settings" header
    const header = panel.locator("h2");
    await expect(header).toHaveText("Settings");

    // Should have Language section
    const langText = panel.locator("text=Language");
    await expect(langText.first()).toBeVisible();

    // Should have Equalizer section
    const eqText = panel.locator("text=Equalizer");
    await expect(eqText.first()).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: "test-results/mobile-settings-panel.png",
      fullPage: false,
    });
  });

  test("settings panel closes on X button", async ({ page }) => {
    const settingsBtn = page.locator('[data-testid="mobile-settings-btn"]');
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const panel = page.locator('[data-testid="mobile-settings-panel"]');
    await expect(panel).toBeVisible();

    // Click the close button
    const closeBtn = panel.locator("button").first();
    await closeBtn.click();
    await page.waitForTimeout(400);

    await expect(panel).not.toBeVisible();
  });

  test("bottom bar has no audio badges in mobile", async ({ page }) => {
    // Click a station to trigger audio badges
    const stationCards = page.locator('[role="button"][aria-label]');
    if ((await stationCards.count()) > 0) {
      await stationCards.first().click();
      await page.waitForTimeout(3000);
    }

    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    const barText = await bottomBar.textContent();

    // Should NOT contain audio badge labels
    expect(barText).not.toContain("Noise Reduction");
    expect(barText).not.toContain("Audio Normalizer");
  });
});
