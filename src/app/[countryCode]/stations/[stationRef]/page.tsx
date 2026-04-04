/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Radio from '@/components/radio';
import { COUNTRY_BY_CODE } from '@/logic/i18n';
import {
  readStationRoutes,
  readStationByRef,
  readStationsByCountry,
  type StationSnapshot,
} from '@/logic/station-catalog';

export const dynamicParams = false;

const SITE_URL = 'https://www.pulse-radio.online';
const RELATED_STATIONS_COUNT = 5;

type StationPageProps = {
  params: Promise<{ countryCode: string; stationRef: string }>;
};

/* ── Static params ────────────────────────────────────────────────── */

export function generateStaticParams() {
  return readStationRoutes().map((r) => ({
    countryCode: r.countryCode,
    stationRef: r.stationRef,
  }));
}

/* ── Metadata ─────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: StationPageProps): Promise<Metadata> {
  const { countryCode, stationRef } = await params;
  const station = readStationByRef(stationRef);
  if (!station) return {};

  const country = COUNTRY_BY_CODE[countryCode.toUpperCase()];
  const countryName = country?.name ?? station.country;

  const title = `Listen to ${station.name} in ${countryName} | Pulse Radio`;

  const parts: string[] = [`Stream ${station.name} live from ${countryName}.`];
  if (station.tags) parts.push(`Genres: ${station.tags.split(',').slice(0, 4).join(', ')}.`);
  if (station.codec && station.bitrate) parts.push(`${station.codec} ${station.bitrate} kbps.`);
  if (station.language) parts.push(`Language: ${station.language}.`);
  const description = parts.join(' ');

  const canonical = `${SITE_URL}/${countryCode}/stations/${stationRef}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'Pulse Radio',
      locale: 'en_US',
    },
    twitter: { card: 'summary_large_image', title, description },
    other: {
      ...(country ? { 'geo.region': countryCode.toUpperCase(), 'geo.placename': countryName } : {}),
    },
  };
}

/* ── JSON-LD helpers ──────────────────────────────────────────────── */

function BreadcrumbJsonLd({
  countryName,
  countryCode,
  stationName,
  stationRef,
}: {
  countryName: string;
  countryCode: string;
  stationName: string;
  stationRef: string;
}) {
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: countryName,
        item: `${SITE_URL}/${countryCode}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: stationName,
        item: `${SITE_URL}/${countryCode}/stations/${stationRef}`,
      },
    ],
  });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />;
}

function WebPageJsonLd({
  station,
  countryCode,
  countryName,
}: {
  station: StationSnapshot;
  countryCode: string;
  countryName: string;
}) {
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Listen to ${station.name} in ${countryName}`,
    description: `Stream ${station.name} live from ${countryName} on Pulse Radio.`,
    url: `${SITE_URL}/${countryCode}/stations/${station.routeKey}`,
    isPartOf: { '@type': 'WebSite', name: 'Pulse Radio', url: SITE_URL },
  });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />;
}

function RadioStationJsonLd({ station }: { station: StationSnapshot }) {
  const tags = station.tags
    ? station.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'RadioStation',
    name: station.name,
    url: station.url_resolved,
    ...(station.favicon ? { logo: station.favicon } : {}),
    ...(station.homepage ? { sameAs: station.homepage } : {}),
    ...(station.country ? { areaServed: station.country } : {}),
    ...(station.language ? { inLanguage: station.language } : {}),
    ...(tags.length > 0 ? { genre: tags } : {}),
  });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />;
}

/* ── Page component ───────────────────────────────────────────────── */

export default async function StationPage({ params }: StationPageProps) {
  const { countryCode, stationRef } = await params;
  const station = readStationByRef(stationRef);
  if (!station) notFound();

  const cc = countryCode.toUpperCase();
  const country = COUNTRY_BY_CODE[cc];
  const countryName = country?.name ?? station.country;

  const tags = station.tags
    ? station.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const related = readStationsByCountry(cc)
    .filter((s) => s.stationuuid !== station.stationuuid)
    .slice(0, RELATED_STATIONS_COUNT);

  return (
    <div className="h-full w-full relative">
      {/* ── Structured Data ────────────────────────────────────────── */}
      <BreadcrumbJsonLd
        countryName={countryName}
        countryCode={cc}
        stationName={station.name}
        stationRef={stationRef}
      />
      <WebPageJsonLd station={station} countryCode={cc} countryName={countryName} />
      <RadioStationJsonLd station={station} />

      {/* ── Server-rendered SEO content ────────────────────────────── */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center bg-[#0a0f1a]">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/50">
          <Link href="/" className="hover:text-white/80 underline">
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link href={`/${cc}`} className="hover:text-white/80 underline">
            {countryName}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-white/70">{station.name}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4 text-white">{station.name}</h1>

        <p className="text-white/70 max-w-2xl text-lg leading-relaxed mb-4">
          Listen to {station.name} live from {countryName} on Pulse Radio.
          {station.codec && station.bitrate > 0 && (
            <>
              {' '}
              Streaming in {station.codec} at {station.bitrate} kbps.
            </>
          )}
          {station.language && <> Language: {station.language}.</>}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-xl">
            {tags.slice(0, 6).map((tag) => (
              <Link
                key={tag}
                href={`/${cc}?genre=${encodeURIComponent(tag)}`}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {station.homepage && (
          <a
            href={station.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline mb-4 inline-block"
          >
            Visit station website ↗
          </a>
        )}

        <Link
          href={`/${cc}`}
          className="text-sm text-white/50 hover:text-white/80 underline mb-6 inline-block"
        >
          ← More stations in {countryName}
        </Link>

        {/* ── Related stations ────────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-2 max-w-2xl w-full">
            <h2 className="text-sm font-semibold text-white/60 mb-2">
              More stations in {countryName}
            </h2>
            <ul className="flex flex-wrap justify-center gap-2">
              {related.map((rs) => (
                <li key={rs.stationuuid}>
                  <Link
                    href={`/${cc}/stations/${rs.routeKey}`}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20 transition-colors"
                  >
                    {rs.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Client-side Radio player ──────────────────────────────── */}
      <div className="relative z-10 h-full">
        <Radio initialCountryCode={cc} />
      </div>
    </div>
  );
}
