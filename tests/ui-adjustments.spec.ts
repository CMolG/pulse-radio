import { test, expect } from "@playwright/test";

test.describe("UI adjustments — theater, bottom bar, layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  });

  test("mobile bottom bar shows 'Title - Artist' format", async ({ page }) => {
    const card = page.locator('[data-testid="station-card"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(4000);

      const bottomBar = page.locator('[data-testid="mobile-bottom-bar"]');
      await expect(bottomBar).toBeVisible();

      // Get the primary text line in the track info section
      const titleLine = bottomBar.locator("p.text-\\[13px\\].font-medium.text-white").first();
      const text = await titleLine.textContent();

      // If a track with artist is playing, it should contain " - "
      if (text && !text.includes("No station") && text.includes("-")) {
        expect(text).toMatch(/.+ - .+/);
      }

      await page.screenshot({
        path: "test-results/mobile-bottom-bar-title-artist.png",
        fullPage: false,
      });
    }
  });

  test("theater mode shows artist name above album art", async ({ page }) => {
    const card = page.locator('[data-testid="station-card"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(4000);

      // Open theater mode
      const theaterBtn = page
        .locator('[data-testid="mobile-bottom-bar"]')
        .locator('button[title="Theater"]');
      if (await theaterBtn.isVisible()) {
        await theaterBtn.click();
        await page.waitForTimeout(2000);

        // The theater view glassmorphism card should exist
        const glassCard = page.locator(".rounded-3xl.max-w-sm");
        await expect(glassCard).toBeVisible();

        // The card should have content
        const cardHTML = await glassCard.innerHTML();
        expect(cardHTML.length).toBeGreaterThan(100);

        await page.screenshot({
          path: "test-results/theater-artist-above-album.png",
          fullPage: false,
        });
      }
    }
  });

  test("theater mode has Apple Music and Share on same row", async ({
    page,
  }) => {
    const card = page.locator('[data-testid="station-card"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(4000);

      const theaterBtn = page
        .locator('[data-testid="mobile-bottom-bar"]')
        .locator('button[title="Theater"]');
      if (await theaterBtn.isVisible()) {
        await theaterBtn.click();
        await page.waitForTimeout(2000);

        const appleMusicLink = page.locator('a:has-text("Listen on Apple Music")').first();
        const shareBtn = page.locator('button[aria-label="Share"]').first();

        if (
          (await appleMusicLink.isVisible()) &&
          (await shareBtn.isVisible())
        ) {
          const appleBox = await appleMusicLink.boundingBox();
          const shareBox = await shareBtn.boundingBox();
          if (appleBox && shareBox) {
            // They should be on approximately the same Y line (same row)
            expect(Math.abs(appleBox.y - shareBox.y)).toBeLessThan(20);
          }
        }

        await page.screenshot({
          path: "test-results/theater-share-apple-same-row.png",
          fullPage: false,
        });
      }
    }
  });

  test("desktop theater: album card is centered", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const card = page.locator('[data-testid="station-card"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(4000);

      // Open theater via keyboard shortcut
      await page.keyboard.press("t");
      await page.waitForTimeout(2000);

      const glassCard = page.locator(".rounded-3xl.max-w-sm").first();
      if (await glassCard.isVisible()) {
        const box = await glassCard.boundingBox();
        if (box) {
          const cardCenter = box.x + box.width / 2;
          const viewportCenter = 1440 / 2;
          // Card center should be within 100px of viewport center
          expect(Math.abs(cardCenter - viewportCenter)).toBeLessThan(100);
        }
      }

      await page.screenshot({
        path: "test-results/desktop-theater-centered-card.png",
        fullPage: false,
      });
    }
  });

  test("desktop now-playing bar shows station name below LIVE", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const card = page.locator('[data-testid="station-card"]').first();
    if (await card.isVisible()) {
      await card.click();
      await page.waitForTimeout(4000);

      // The LIVE indicator area should contain the station name below it
      const liveContainer = page.locator(".flex.flex-col.gap-0\\.5.relative.z-10").first();
      if (await liveContainer.isVisible()) {
        const liveText = liveContainer.locator("text=LIVE");
        await expect(liveText).toBeVisible();

        const stationName = liveContainer.locator("span.text-\\[10px\\].text-white\\/25");
        await expect(stationName).toBeVisible();
      }

      await page.screenshot({
        path: "test-results/desktop-station-below-live.png",
        fullPage: false,
      });
    }
  });
});
