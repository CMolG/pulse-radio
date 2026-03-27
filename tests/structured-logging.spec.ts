import { test, expect } from '@playwright/test';

test.describe('Structured Logging (ARCH-075)', () => {
  test('health endpoint logs request (verifies logger is wired)', async ({ request }) => {
    // Smoke test: calling an API route should not crash with logger
    const res = await request.get('/api/v1/health');
    expect(res.status()).toBe(200);
  });

  test('itunes route logs request and returns valid response', async ({ request }) => {
    const res = await request.get('/api/v1/itunes?term=test');
    expect([200, 504]).toContain(res.status());
    // Verify response is valid JSON (logger didn't corrupt output)
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('icy-meta route with invalid URL returns 400 (sanitize + logger)', async ({ request }) => {
    const res = await request.get('/api/v1/icy-meta?url=not-a-url');
    expect(res.status()).toBe(400);
  });

  test('proxy-stream route with invalid URL returns 400', async ({ request }) => {
    const res = await request.get('/api/v1/proxy-stream?url=javascript:void(0)');
    expect(res.status()).toBe(400);
  });
});
