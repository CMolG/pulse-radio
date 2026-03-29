import { test, expect } from '@playwright/test';

test.describe('CSP Audio Streaming (ARCH-131)', () => {
  test('CSP header includes all required directives', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    const csp = response!.headers()['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("media-src 'self' http: https: data: blob:");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain('report-uri /api/csp-report');
  });

  test('connect-src whitelists all external APIs', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response!.headers()['content-security-policy'];
    const connectSrc = csp
      .split(';')
      .find((d: string) => d.trim().startsWith('connect-src'));
    expect(connectSrc).toBeDefined();
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('de1.api.radio-browser.info');
    expect(connectSrc).toContain('lrclib.net');
    expect(connectSrc).toContain('itunes.apple.com');
    expect(connectSrc).toContain('rest.bandsintown.com');
    expect(connectSrc).toContain('musicbrainz.org');
    expect(connectSrc).toContain('en.wikipedia.org');
    expect(connectSrc).toContain('upload.wikimedia.org');
  });

  test('no CSP violations on page load', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        msg.text().toLowerCase().includes('content security policy')
      ) {
        violations.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    expect(violations).toEqual([]);
  });

  test('CSP report endpoint accepts violation reports', async ({ request }) => {
    const res = await request.post('/api/csp-report', {
      data: {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          'violated-directive': 'script-src',
          'document-uri': 'https://localhost:3000/',
        },
      },
    });
    expect(res.status()).toBe(204);
  });

  test('CSP report endpoint rejects invalid body', async ({ request }) => {
    const res = await request.post('/api/csp-report', {
      data: 'not json',
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(res.status()).toBe(400);
  });
});
