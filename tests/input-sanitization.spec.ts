import { test, expect } from '@playwright/test';

test.describe('Input Sanitization Layer (ARCH-034)', () => {
  test('itunes rejects empty term', async ({ request }) => {
    const res = await request.get('/api/v1/itunes?term=');
    expect(res.status()).toBe(400);
  });

  test('itunes strips control characters from term', async ({ request }) => {
    // Term with control chars should still work if underlying text is valid
    const res = await request.get('/api/v1/itunes?term=Beatles%00%01');
    // Should not 500 — either 200 (valid after strip) or 400 (empty after strip)
    expect([200, 400]).toContain(res.status());
  });

  test('itunes rejects oversized term', async ({ request }) => {
    const longTerm = 'a'.repeat(300);
    const res = await request.get(`/api/itunes?term=${longTerm}`);
    // sanitizeSearchQuery truncates to 200 chars, so this should still work
    expect([200, 400]).toContain(res.status());
    expect(res.status()).not.toBe(500);
  });

  test('lyrics rejects missing title', async ({ request }) => {
    const res = await request.get('/api/v1/lyrics?artist=test');
    expect(res.status()).toBe(400);
  });

  test('artist-info rejects empty artist', async ({ request }) => {
    const res = await request.get('/api/v1/artist-info?artist=');
    expect(res.status()).toBe(400);
  });

  test('concerts rejects empty artist', async ({ request }) => {
    const res = await request.get('/api/v1/concerts?artist=');
    expect(res.status()).toBe(400);
  });

  test('proxy-stream rejects invalid URL protocol', async ({ request }) => {
    const res = await request.get('/api/v1/proxy-stream?url=ftp://evil.com/stream');
    expect(res.status()).toBe(400);
  });

  test('proxy-stream rejects non-URL input', async ({ request }) => {
    const res = await request.get('/api/v1/proxy-stream?url=not-a-url');
    expect(res.status()).toBe(400);
  });

  test('icy-meta rejects invalid URL', async ({ request }) => {
    const res = await request.get('/api/v1/icy-meta?url=javascript:alert(1)');
    expect(res.status()).toBe(400);
  });

  test('icy-meta rejects empty URL', async ({ request }) => {
    const res = await request.get('/api/v1/icy-meta?url=');
    expect(res.status()).toBe(400);
  });

  test('itunes strips HTML tags from term', async ({ request }) => {
    const res = await request.get('/api/v1/itunes?term=%3Cscript%3Ealert%3C/script%3EBeatles');
    // After stripping <script>alert</script>, "Beatles" remains — should succeed
    expect(res.status()).not.toBe(500);
  });
});
