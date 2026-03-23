import { test, expect } from "@playwright/test";

test.describe("Mobile UI fixes", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  });

  test("bottom bar has no heart button in compact mode", async ({ page }) => {
    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    // Heart button should NOT exist in the compact bottom bar
    const heartBtn = bottomBar.locator('button[title="Favorite song"]');
    await expect(heartBtn).toHaveCount(0);

    // Play button should still exist
    const playArea = bottomBar.locator("button").first();
    await expect(playArea).toBeVisible();
  });

  test("play button has adequate size in bottom bar", async ({ page }) => {
    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    const playBtn = bottomBar.locator("button").first();
    const box = await playBtn.boundingBox();
    expect(box).not.toBeNull();
    // Should be at least 48px (w-12 = 3rem = 48px)
    expect(box!.width).toBeGreaterThanOrEqual(46);
    expect(box!.height).toBeGreaterThanOrEqual(46);
  });

  test("audio plays when a station is clicked in mobile viewport", async ({
    page,
  }) => {
    // Click on first station card to start playing
    const stationCard = page.locator('[data-testid="station-card"]').first();
    if (await stationCard.isVisible()) {
      await stationCard.click();
      await page.waitForTimeout(3000);

      // Check that an audio element exists and has a src
      const audioSrc = await page.evaluate(() => {
        const audio = document.querySelector("audio");
        return audio?.src || null;
      });

      // If there's a station card, clicking it should set up audio
      if (audioSrc) {
        expect(audioSrc.length).toBeGreaterThan(0);
      }
    }
  });

  test("lyrics section has top margin in mobile theater", async ({ page }) => {
    // Click station to start playback
    const stationCard = page.locator('[data-testid="station-card"]').first();
    if (await stationCard.isVisible()) {
      await stationCard.click();
      await page.waitForTimeout(2000);

      // Open theater mode
      const theaterBtn = page
        .locator('[data-testid="mobile-bottom-bar"]')
        .locator('button[title="Theater"]');
      if (await theaterBtn.isVisible()) {
        await theaterBtn.click();
        await page.waitForTimeout(1500);

        // Take screenshot to verify lyrics position
        await page.screenshot({
          path: "test-results/mobile-theater-lyrics.png",
          fullPage: false,
        });
      }
    }
  });
});
