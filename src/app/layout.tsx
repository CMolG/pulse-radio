/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});
const SITE_URL = 'https://www.pulse-radio.online';
const SITE_TITLE = 'Pulse Radio — Free Internet Radio with Visualizer';
const SITE_DESCRIPTION =
  'Stream thousands of free internet radio stations worldwide. Enjoy real-time audio visualizer, album art, song history, favorites, and theater mode. No sign-up required.';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s | Pulse Radio' },
  description: SITE_DESCRIPTION,
  manifest: '/site.webmanifest',
  applicationName: 'Pulse Radio',
  keywords: [
    'internet radio',
    'online radio',
    'free radio',
    'radio player',
    'music streaming',
    'audio visualizer',
    'radio stations',
    'live radio',
    'web radio',
    'pulse radio',
  ],
  authors: [{ name: 'Pulse Radio', url: SITE_URL }],
  creator: 'Pulse Radio',
  publisher: 'Pulse Radio',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Pulse Radio' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Pulse Radio',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: SITE_URL },
  category: 'music',
  other: { 'mobile-web-app-capable': 'yes' },
};
export const viewport: Viewport = {
  themeColor: '#0a0f1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};
const _JSON_LD_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Pulse Radio',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  softwareVersion: '1.0',
  screenshot: `${SITE_URL}/android-chrome-512x512.png`,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?search={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});
function JsonLd() {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: _JSON_LD_SCHEMA }} />
  );
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#0a0f1a]`}
    >
      <body className="h-full bg-[#0a0f1a] text-white">
        <link rel="preconnect" href="https://de2.api.radio-browser.info" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://de2.api.radio-browser.info" />
        <link rel="preconnect" href="https://is1-ssl.mzstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://is1-ssl.mzstatic.com" />
        <noscript>
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              fontFamily: 'system-ui, sans-serif',
              color: '#ffffff',
            }}
          >
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Pulse Radio</h1>
            <p>JavaScript is required to run this application.</p>
            <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
              Please enable JavaScript in your browser settings and reload the page.
            </p>
          </div>
        </noscript>
        <WebVitalsReporter />
        <JsonLd /> {children} <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
