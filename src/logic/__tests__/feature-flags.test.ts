import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('feature-flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('defaults all flags to false when env vars are unset', async () => {
    delete process.env.NEXT_PUBLIC_ERROR_REPORTING;
    delete process.env.NEXT_PUBLIC_ANALYTICS;
    const { flags } = await import('../feature-flags');
    expect(flags.errorReporting).toBe(false);
    expect(flags.analytics).toBe(false);
    expect(flags.authEnabled).toBe(false);
    expect(flags.debugMode).toBe(false);
  });

  it('enables flags when env vars are "true"', async () => {
    process.env.NEXT_PUBLIC_ERROR_REPORTING = 'true';
    process.env.NEXT_PUBLIC_DEBUG = 'true';
    const { flags } = await import('../feature-flags');
    expect(flags.errorReporting).toBe(true);
    expect(flags.debugMode).toBe(true);
  });

  it('isEnabled returns flag value', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS = 'true';
    const { isEnabled } = await import('../feature-flags');
    expect(isEnabled('analytics')).toBe(true);
    expect(isEnabled('authEnabled')).toBe(false);
  });

  it('ignores non-"true" values', async () => {
    process.env.NEXT_PUBLIC_ERROR_REPORTING = 'yes';
    const { flags } = await import('../feature-flags');
    expect(flags.errorReporting).toBe(false);
  });
});
