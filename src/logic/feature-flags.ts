const isDev = process.env.NODE_ENV !== 'production';

export const flags = {
  errorReporting: process.env.NEXT_PUBLIC_ERROR_REPORTING === 'true',
  analytics: process.env.NEXT_PUBLIC_ANALYTICS === 'true',
  authEnabled: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',
  debugMode: process.env.NEXT_PUBLIC_DEBUG === 'true',
} as const;

export type FeatureFlag = keyof typeof flags;

/**
 * Check if a feature flag is enabled.
 * In development, allows localStorage overrides via `ff_override_<flag>`.
 */
export function isEnabled(flag: FeatureFlag): boolean {
  if (isDev && typeof window !== 'undefined') {
    const override = localStorage.getItem(`ff_override_${flag}`);
    if (override === 'true') return true;
    if (override === 'false') return false;
  }
  return flags[flag];
}

/** Set a development-only override for a feature flag */
export function setFlagOverride(flag: FeatureFlag, value: boolean | null): void {
  if (!isDev || typeof window === 'undefined') return;
  if (value === null) {
    localStorage.removeItem(`ff_override_${flag}`);
  } else {
    localStorage.setItem(`ff_override_${flag}`, String(value));
  }
}
