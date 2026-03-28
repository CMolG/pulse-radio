function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

interface Env {
  readonly CRON_SECRET: string;
  readonly BANDSINTOWN_APP_ID: string;
  readonly NEXT_PUBLIC_BASE_URL: string;
  readonly APP_VERSION: string;
}

export const env: Env = {
  get CRON_SECRET() {
    const value = process.env.CRON_SECRET;
    if (value) return value;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Missing required environment variable: CRON_SECRET. See .env.example for documentation.',
      );
    }
    return 'dev-secret';
  },

  BANDSINTOWN_APP_ID: optionalEnv('BANDSINTOWN_APP_ID', 'js_1dhsfh3t4'),

  NEXT_PUBLIC_BASE_URL: optionalEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000'),

  APP_VERSION: optionalEnv('npm_package_version', '0.1.0'),
};
