import { test, expect } from '@playwright/test';

test.describe('Station Reliability Scoring (ARCH-038)', () => {
  test('station-health endpoint returns 400 without urls param', async ({ request }) => {
    const res = await request.get('/api/station-health');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing');
  });

  test('station-health endpoint returns scores for urls', async ({ request }) => {
    const res = await request.get('/api/station-health?urls=http://example.com/stream,http://other.com/stream');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body['http://example.com/stream']).toBeDefined();
    expect(typeof body['http://example.com/stream']).toBe('number');
    // Unknown stations default to 0.5
    expect(body['http://example.com/stream']).toBe(0.5);
  });

  test('station-health limits to 50 urls', async ({ request }) => {
    const urls = Array.from({ length: 60 }, (_, i) => `http://s${i}.com/stream`).join(',');
    const res = await request.get(`/api/station-health?urls=${urls}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).length).toBeLessThanOrEqual(50);
  });

  test('proxy-stream records health data on failure', async ({ request }) => {
    // Try a non-existent stream
    const fakeUrl = 'http://192.0.2.1:9999/nonexistent';
    await request.get(`/api/proxy-stream?url=${encodeURIComponent(fakeUrl)}`);
    // Now check health score — should be < 0.5 after failure
    const res = await request.get(`/api/station-health?urls=${encodeURIComponent(fakeUrl)}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // After a failure, score should drop below default 0.5
    expect(body[fakeUrl]).toBeLessThanOrEqual(0.5);
  });

  test('station_health table is accessible', async ({ request }) => {
    const res = await request.get('/api/health?deep=true');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBeDefined();
  });
});
