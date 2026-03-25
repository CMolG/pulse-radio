import { test, expect } from "@playwright/test";

test.describe("Desktop settings and glassmorphism", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    // Dismiss the onboarding modal if present
    const skipBtn = page.locator("text=Skip");
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("settings button exists in desktop header", async ({ page }) => {
    const settingsBtn = page.locator('[data-testid="desktop-settings-btn"]');
    await expect(settingsBtn).toBeVisible();
    await page.screenshot({
      path: "test-results/desktop-settings-btn.png",
      fullPage: false,
    });
  });

  test("settings modal opens with language and EQ sections", async ({
    page,
  }) => {
    const settingsBtn = page.locator('[data-testid="desktop-settings-btn"]');
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="desktop-settings-modal"]');
    await expect(modal).toBeVisible();

    // Should show "Settings" header
    const header = modal.locator("h2");
    await expect(header).toHaveText("Settings");

    // Should have Language section
    const langText = modal.locator("text=Language");
    await expect(langText.first()).toBeVisible();

    // Should have Equalizer section
    const eqText = modal.locator("text=Equalizer");
    await expect(eqText.first()).toBeVisible();

    await page.screenshot({
      path: "test-results/desktop-settings-modal.png",
      fullPage: false,
    });
  });

  test("settings modal closes on X button", async ({ page }) => {
    const settingsBtn = page.locator('[data-testid="desktop-settings-btn"]');
    await settingsBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-testid="desktop-settings-modal"]');
    await expect(modal).toBeVisible();

    // Click close button (first button in the header)
    const closeBtn = modal.locator('button[aria-label="Close settings"]');
    await closeBtn.click();
    await page.waitForTimeout(400);

    await expect(modal).not.toBeVisible();
  });

  test("desktop bottom bar has glassmorphism effect", async ({ page }) => {
    // The desktop bottom bar should have the glass style
    const bottomBar = page
      .locator(".relative.z-10.border-t.border-white\\/10")
      .last();

    const styles = await bottomBar.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        backdropFilter: cs.backdropFilter,
      };
    });

    console.log("Desktop bottom bar styles:", styles);

    // Should have semi-transparent background (not fully opaque)
    expect(styles.backgroundColor).toContain("rgba");

    // Should have blur backdrop filter
    expect(styles.backdropFilter).toContain("blur");

    await page.screenshot({
      path: "test-results/desktop-glassmorphism.png",
      fullPage: false,
    });
  });
});
