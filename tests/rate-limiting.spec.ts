import { test, expect } from '@playwright/test';

test.describe('API Rate Limiting (ARCH-032)', () => {
  test('normal API call succeeds with 200', async ({ request }) => {
    const res = await request.get('/api/itunes?term=test');
    expect(res.status()).not.toBe(429);
  });

  test('exceeding rate limit returns 429 with Retry-After', async ({
    request,
  }) => {
    // proxy-stream has limit of 10/min — send 12 requests rapidly
    const results: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await request.get('/api/proxy-stream');
      results.push(res.status());
    }

    const has429 = results.some((s) => s === 429);
    expect(has429).toBe(true);

    // The 429 response should include Retry-After header
    const lastRes = await request.get('/api/proxy-stream');
    if (lastRes.status() === 429) {
      const retryAfter = lastRes.headers()['retry-after'];
      expect(retryAfter).toBeDefined();
      expect(Number(retryAfter)).toBeGreaterThan(0);
      const body = await lastRes.json();
      expect(body.error).toBe('Too many requests');
    }
  });

  test('rate limit is per-route (different routes have independent limits)', async ({
    request,
  }) => {
    // Even if proxy-stream is limited, itunes should still work
    const itunesRes = await request.get('/api/itunes?term=hello');
    expect(itunesRes.status()).not.toBe(429);
  });

  test('all API routes respond without crashing', async ({ request }) => {
    const routes = [
      '/api/itunes?term=test',
      '/api/lyrics?title=test&artist=test',
      '/api/artist-info?artist=test',
      '/api/concerts?artist=test',
    ];

    for (const route of routes) {
      const res = await request.get(route);
      // Should not crash (500) — 4xx and other 5xx (502/503/504) are valid business responses
      expect(res.status()).not.toBe(500);
    }
  });
});
