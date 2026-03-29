import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: http: https:",
  "font-src 'self'",
  [
    "connect-src 'self'",
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://nl1.api.radio-browser.info',
    'https://lrclib.net',
    'https://itunes.apple.com',
    'https://rest.bandsintown.com',
    'https://musicbrainz.org',
    'https://en.wikipedia.org',
    'https://upload.wikimedia.org',
  ].join(' '),
  "media-src 'self' http: https: data: blob:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'report-uri /api/csp-report',
];

const contentSecurityPolicy = cspDirectives.join('; ');

const securityHeaders: ReadonlyArray<[string, string]> = [
  ['Content-Security-Policy', contentSecurityPolicy],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), autoplay=(self)'],
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  for (const [key, value] of securityHeaders) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.webmanifest$|sw\\.js$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
