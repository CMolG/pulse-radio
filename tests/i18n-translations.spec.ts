import { test, expect } from '@playwright/test';

test.describe('i18n Translations (ARCH-047)', () => {
  test('Chinese locale renders translated text', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('radio-locale', 'zh');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[\u4e00-\u9fff]/);
  });

  test('Spanish locale renders translated text', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('radio-locale', 'es');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/Favoritos|Descubrir|emisoras|Buscar/);
  });

  test('Russian locale renders Cyrillic text', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('radio-locale', 'ru');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[\u0400-\u04ff]/);
  });

  test('Korean locale renders Hangul text', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('radio-locale', 'ko');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toMatch(/[\uac00-\ud7af]/);
  });
});
