import { test, expect } from '@playwright/test';

test.describe('Zod Schema Validation (ARCH-128)', () => {
  test('itunes returns validation error for missing term', async ({ request }) => {
    const res = await request.get('/api/v1/itunes');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
    expect(body.details.length).toBeGreaterThan(0);
  });

  test('lyrics returns validation error for missing title', async ({ request }) => {
    const res = await request.get('/api/v1/lyrics?artist=test');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  test('lyrics validates duration coercion', async ({ request }) => {
    const res = await request.get('/api/v1/lyrics?artist=test&title=hello&duration=abc');
    expect(res.status()).toBe(400);
  });

  test('artist-info returns validation error for empty artist', async ({ request }) => {
    const res = await request.get('/api/v1/artist-info?artist=');
    expect(res.status()).toBe(400);
  });

  test('concerts returns validation error for missing artist', async ({ request }) => {
    const res = await request.get('/api/v1/concerts');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  test('proxy-stream returns 400 for non-URL input', async ({ request }) => {
    const res = await request.get('/api/v1/proxy-stream?url=not-a-url');
    expect(res.status()).toBe(400);
  });

  test('icy-meta returns 400 for non-URL input', async ({ request }) => {
    const res = await request.get('/api/v1/icy-meta?url=not-a-url');
    expect(res.status()).toBe(400);
  });

  test('itunes valid request still works', async ({ request }) => {
    const res = await request.get('/api/v1/itunes?term=Beatles');
    expect([200, 504]).toContain(res.status());
  });

  test('error shape is consistent across routes', async ({ request }) => {
    const routes = [
      '/api/v1/itunes',
      '/api/v1/lyrics',
      '/api/v1/concerts',
      '/api/v1/artist-info',
    ];
    for (const route of routes) {
      const res = await request.get(route);
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    }
  });
});
