/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type {
  Metadata,
  Viewport,
} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
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
    images: [{ url: '/android-chrome-512x512.png', width: 512, height: 512, alt: 'Pulse Radio' }],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/android-chrome-512x512.png'],
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
function JsonLd() {
  const schema = {
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
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#0a0f1a]`}
    >
      <body className="h-full bg-[#0a0f1a] text-white">
        <JsonLd /> {children} <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
