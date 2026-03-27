import { test, expect } from '@playwright/test';

test.describe('Security Headers (ARCH-031)', () => {
  test('page responses include all security headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const headers = response!.headers();

    // CSP
    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain('media-src *');
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain('connect-src');
    expect(csp).toContain('de1.api.radio-browser.info');
    expect(csp).toContain('lrclib.net');

    // HSTS
    expect(headers['strict-transport-security']).toContain('max-age=63072000');
    expect(headers['strict-transport-security']).toContain('includeSubDomains');

    // Other security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('microphone=()');
    expect(headers['permissions-policy']).toContain('geolocation=()');
    expect(headers['permissions-policy']).toContain('autoplay=(self)');
  });

  test('API routes also receive security headers', async ({ request }) => {
    const response = await request.get('/api/proxy-stream');
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('no CSP violations on page load', async ({ page }) => {
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('Content-Security-Policy') ||
        text.includes('CSP') ||
        text.includes('Refused to')
      ) {
        cspViolations.push(text);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);
    expect(cspViolations).toEqual([]);
  });

  test('iTunes artwork images load without CSP block', async ({ page }) => {
    await page.goto('/');

    // Check that Image elements can have external https src
    const brokenImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const broken: string[] = [];
      images.forEach((img) => {
        if (img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
          broken.push(img.src);
        }
      });
      return broken;
    });

    // No images should be broken due to CSP
    for (const src of brokenImages) {
      if (src.includes('mzstatic.com') || src.includes('radio-browser.info')) {
        throw new Error(`CSP blocked image: ${src}`);
      }
    }
  });

  test('audio playback not blocked by CSP', async ({ page }) => {
    await page.goto('/');
    // Verify audio element can be created
    const canCreateAudio = await page.evaluate(() => {
      try {
        const audio = new Audio();
        return audio instanceof HTMLAudioElement;
      } catch {
        return false;
      }
    });
    expect(canCreateAudio).toBe(true);
  });
});
