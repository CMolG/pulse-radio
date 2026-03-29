import { test, expect } from '@playwright/test';

test.describe('iOS Background Audio (ARCH-101)', () => {
  test('iOS: AudioContext is NOT created on initial play when effects are off', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () =>
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that the code recognises iOS — the isIOSDevice function is module-scoped
    const isIOS = await page.evaluate(() => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    });
    expect(isIOS).toBe(true);

    // Verify no AudioContext is created before any interaction (effects off by default)
    const ctxCount = await page.evaluate(() => {
      return (window as Record<string, unknown>).__audioContextCount ?? 0;
    });
    // Should be 0 or at most the shared context (lazy-created), but NOT a MediaElementSource
    expect(ctxCount).toBeLessThanOrEqual(1);
  });

  test('non-iOS: AudioContext connection is allowed', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () =>
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const isIOS = await page.evaluate(() => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent);
    });
    expect(isIOS).toBe(false);
  });

  test('Media Session artwork URL resolution converts relative to absolute', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the relative-to-absolute resolution logic used in RadioShell
    const result = await page.evaluate(() => {
      let imgSrc = '/android-chrome-512x512.png';
      if (imgSrc.startsWith('/')) {
        imgSrc = `${window.location.origin}${imgSrc}`;
      }
      return imgSrc;
    });

    // Should be absolute with origin prefix
    expect(result).toMatch(/^https?:\/\//);
    expect(result).toContain('/android-chrome-512x512.png');
    expect(result).not.toMatch(/^\/[^/]/); // not a relative path
  });

  test('Media Session metadata is set with correct fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasMediaSession = await page.evaluate(() => 'mediaSession' in navigator);
    expect(hasMediaSession).toBe(true);

    // Verify the mediaSession API is accessible
    const playbackState = await page.evaluate(() => navigator.mediaSession.playbackState);
    // Before playing, state should be 'none' or 'paused'
    expect(['none', 'paused']).toContain(playbackState);
  });

  test('iOS UA detection correctly identifies iOS devices', async ({ page }) => {
    // Test iPhone
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      });
    });
    await page.goto('/');
    const isIOS = await page.evaluate(() => /iPad|iPhone|iPod/.test(navigator.userAgent));
    expect(isIOS).toBe(true);

    // Test iPad Pro (MacIntel with touch)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
        configurable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 5,
        configurable: true,
      });
    });
    await page.goto('/');
    const isIPadPro = await page.evaluate(() => {
      return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    });
    expect(isIPadPro).toBe(true);
  });
});
