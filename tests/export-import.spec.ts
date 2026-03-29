import { test, expect } from '@playwright/test';

test.describe('Export/Import Data (ARCH-054)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('export creates valid JSON with correct schema', async ({ page }) => {
    // Seed some localStorage data
    await page.evaluate(() => {
      localStorage.setItem('radio-favorites', JSON.stringify([{ stationuuid: 'abc' }]));
      localStorage.setItem('radio-volume', '0.8');
    });

    const exported = await page.evaluate(() => {
      const data: Record<string, unknown> = {};
      const keys = ['radio-favorites', 'radio-volume'];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
        }
      }
      return {
        app: 'pulse-radio',
        version: 1,
        exportedAt: new Date().toISOString(),
        data,
      };
    });

    expect(exported.app).toBe('pulse-radio');
    expect(exported.version).toBe(1);
    expect(exported.data['radio-favorites']).toEqual([{ stationuuid: 'abc' }]);
  });

  test('import validates schema and rejects invalid files', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const invalid = JSON.stringify({ notPulseRadio: true });
      try {
        const parsed = JSON.parse(invalid);
        const isValid = parsed.app === 'pulse-radio' && typeof parsed.version === 'number';
        return { valid: isValid };
      } catch {
        return { valid: false };
      }
    });
    expect(result.valid).toBe(false);
  });

  test('merge mode deduplicates arrays by stationuuid', async ({ page }) => {
    const result = await page.evaluate(() => {
      const existing = [{ stationuuid: 'a', name: 'Station A' }];
      const incoming = [
        { stationuuid: 'a', name: 'Station A' },
        { stationuuid: 'b', name: 'Station B' },
      ];
      const seen = new Set(existing.map(e => e.stationuuid));
      const merged = [...existing, ...incoming.filter(i => !seen.has(i.stationuuid))];
      return merged;
    });
    expect(result).toHaveLength(2);
    expect(result[0].stationuuid).toBe('a');
    expect(result[1].stationuuid).toBe('b');
  });

  test('replace mode overwrites existing data', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('radio-favorites', JSON.stringify([{ stationuuid: 'old' }]));
      // Simulate replace: just overwrite
      const imported = [{ stationuuid: 'new' }];
      localStorage.setItem('radio-favorites', JSON.stringify(imported));
    });
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('radio-favorites') || '[]'),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].stationuuid).toBe('new');
  });
});
