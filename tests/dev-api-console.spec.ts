import { test, expect } from "@playwright/test";

test.describe("Dev API Console", () => {
  test("shows lyrics REQ/RES and dedupes repeated ICY content", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      try {
        localStorage.setItem("radio-onboarding-done", "true");
      } catch {}
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);

    const consoleToggle = page.locator('button:has-text("API Console")');
    if (!(await consoleToggle.isVisible().catch(() => false))) {
      test.skip(true, "DevApiConsole is only rendered in development");
      return;
    }
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((el) =>
        (el.textContent ?? "").includes("API Console"),
      ) as HTMLButtonElement | undefined;
      button?.click();
    });
    await page.waitForTimeout(300);

    const panel = page.locator("div").filter({ hasText: "⚡ API Console" }).first();
    await expect(panel).toBeVisible();

    const clearBtn = panel.getByRole("button", { name: "Clear" });
    if (await clearBtn.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        const button = [...document.querySelectorAll("button")].find((el) =>
          (el.textContent ?? "").trim() === "Clear",
        ) as HTMLButtonElement | undefined;
        button?.click();
      });
      await page.waitForTimeout(300);
    }

    await page.evaluate(async () => {
      await fetch("/api/lyrics?artist=Daft%20Punk&title=One%20More%20Time").catch(
        () => null,
      );
      const icyTarget = "http://localhost:12345/dev-api-console";
      const icyUrl = `/api/icy-meta?url=${encodeURIComponent(icyTarget)}`;
      await fetch(icyUrl).catch(() => null);
      await fetch(icyUrl).catch(() => null);
      await fetch(icyUrl).catch(() => null);
    });
    await page.waitForTimeout(1000);

    const logArea = panel.locator(".max-h-72.overflow-y-auto");
    await expect(logArea).toContainText(/REQLYRICS/);
    await expect(logArea).toContainText(/RESLYRICS|ERRLYRICS/);

    const icySummary = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("div.px-3.py-1\\.5.border-b")];
      const rowText = rows.map((row) =>
        (row.textContent ?? "").replace(/\s+/g, " ").trim(),
      );
      const req = rowText.filter(
        (text) => text.includes("REQ") && text.includes("ICY") && text.includes("--"),
      ).length;
      const res400 = rowText.filter(
        (text) => text.includes("RES") && text.includes("ICY") && text.includes("400"),
      ).length;
      const errIcy = rowText.filter(
        (text) => text.includes("ERR") && text.includes("ICY"),
      ).length;
      return { req, res400, errIcy };
    });
    expect(icySummary.req).toBe(1);
    expect(icySummary.res400 + icySummary.errIcy).toBe(1);

    await page.screenshot({
      path: "test-results/dev-api-console-mobile.png",
      fullPage: false,
    });
  });
});
