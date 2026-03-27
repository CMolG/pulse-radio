import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need fresh module state per test, so use dynamic import + vi.resetModules
beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn(() => 'en'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'test-agent', onLine: true },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/test' },
    writable: true,
    configurable: true,
  });
});

async function loadModule() {
  return await import('../error-reporting');
}

describe('error-reporting', () => {
  it('reports errors with structured JSON to console', async () => {
    const { reportError } = await loadModule();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError({ error: new Error('test failure') });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.type).toBe('client');
    expect(parsed.message).toBe('test failure');
    expect(parsed.fingerprint).toBeTruthy();
    expect(parsed.timestamp).toBeGreaterThan(0);
    expect(parsed.context.viewport).toBeTruthy();
  });

  it('classifies network errors correctly', async () => {
    const { reportError } = await loadModule();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError({ error: new TypeError('Failed to fetch') });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.type).toBe('network');
  });

  it('deduplicates identical errors within window', async () => {
    const { reportError } = await loadModule();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('dedup test ' + Math.random());
    reportError({ error: err });
    reportError({ error: err });
    reportError({ error: err });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('reportApiError includes status and url', async () => {
    const { reportApiError } = await loadModule();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportApiError(500, '/api/test', '{"error":"fail"}');
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.type).toBe('api');
    expect(parsed.context.status).toBe(500);
    expect(parsed.context.url).toBe('/api/test');
  });

  it('reportAudioError includes media error details', async () => {
    const { reportAudioError } = await loadModule();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportAudioError(4, 'http://stream.example.com', 2);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.type).toBe('audio');
    expect(parsed.context.mediaErrorCode).toBe(4);
    expect(parsed.context.stationUrl).toBe('http://stream.example.com');
  });

  it('rate limits reports per minute', async () => {
    const { reportError } = await loadModule();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (let i = 0; i < 20; i++) {
      reportError({ error: new Error(`rate-limit-${i}-${Math.random()}`) });
    }
    expect(spy.mock.calls.length).toBeLessThanOrEqual(10);
  });
});
