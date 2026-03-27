import { test, expect } from '@playwright/test';

test.describe('Health Check Endpoint (ARCH-033)', () => {
  test('basic health returns 200 with required fields', async ({ request }) => {
    const start = Date.now();
    const res = await request.get('/api/health');
    const elapsed = Date.now() - start;

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeTruthy();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.version).toBeTruthy();
    // Basic check should be fast
    expect(elapsed).toBeLessThan(500);
  });

  test('deep health returns database and radioBrowser checks', async ({ request }) => {
    const res = await request.get('/api/health?deep=true');
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.status).toMatch(/^(healthy|degraded)$/);
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.radioBrowser).toBeDefined();
    // database should be ok in test environment
    expect(body.checks.database).toBe('ok');
  });

  test('no sensitive information exposed', async ({ request }) => {
    const res = await request.get('/api/health?deep=true');
    const text = await res.text();

    // Must not contain env vars, file paths, or internal IPs
    expect(text).not.toContain('process.env');
    expect(text).not.toContain('/Users/');
    expect(text).not.toContain('node_modules');
    expect(text).not.toMatch(/\b192\.168\.\d+\.\d+\b/);
    expect(text).not.toMatch(/\b10\.\d+\.\d+\.\d+\b/);
  });

  test('deep=false is treated as basic health', async ({ request }) => {
    const res = await request.get('/api/health?deep=false');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.checks).toBeUndefined();
  });
});
