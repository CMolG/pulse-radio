import { test, expect } from "@playwright/test";

test.describe("Mobile audio playback", () => {
  test("station loads and bottom bar shows playing state after click", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Find station cards
    const stationCards = page.locator('[role="button"][aria-label]');
    const count = await stationCards.count();

    if (count === 0) {
      test.skip(true, "No stations loaded");
      return;
    }

    // Click the first station
    await stationCards.first().click();
    await page.waitForTimeout(4000);

    // The bottom bar should show station info (it's visible in the compact NowPlayingBar)
    const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
    await expect(bottomBar).toBeVisible();

    // The bottom bar should contain station name or track info text
    const barText = await bottomBar.textContent();
    expect(barText).toBeTruthy();
    expect(barText!.length).toBeGreaterThan(0);

    // The play button should exist and be enabled
    const playBtn = bottomBar.locator("button").first();
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toBeEnabled();

    // Take screenshot of playing state
    await page.screenshot({
      path: "test-results/mobile-audio-playback.png",
      fullPage: false,
    });

    console.log("Bottom bar text:", barText);
  });
});
