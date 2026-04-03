/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Radio from '@/components/radio';
import { COUNTRY_BY_CODE, SOVEREIGN_COUNTRY_CODES } from '@/logic/i18n';
import { SUPPORTED_LOCALES } from '@/logic/i18n';
type CountryPageProps = { params: Promise<{ countryCode: string }> };
const SITE_URL = 'https://www.pulse-radio.online';
function normalizeCountryCode(raw: string): string {
  return raw.toUpperCase();
}
export async function generateStaticParams() {
  return SOVEREIGN_COUNTRY_CODES.map((countryCode) => ({ countryCode }));
}
export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const resolved = await params;
  const countryCode = normalizeCountryCode(resolved.countryCode);
  const country = COUNTRY_BY_CODE[countryCode];
  if (!country) return {};
  const title = `Top radio stations in ${country.name} (${countryCode})`;
  const description = `Listen to top internet radio stations in ${country.name}. Discover popular genres, trending stations, and live broadcasts for ${country.name}.`;
  const canonical = `${SITE_URL}/${countryCode}`;
  const languages: Record<string, string> = { 'x-default': canonical };
  for (const locale of SUPPORTED_LOCALES) {
    languages[locale.code] = canonical;
  }
  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'Pulse Radio',
      locale: 'en_US',
    },
    other: { 'geo.region': countryCode, 'geo.placename': country.name },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function BreadcrumbJsonLd({
  countryName,
  countryCode,
}: {
  countryName: string;
  countryCode: string;
}) {
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: countryName, item: `${SITE_URL}/${countryCode}` },
    ],
  });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />;
}

export default async function CountryPage({ params }: CountryPageProps) {
  const resolved = await params;
  const countryCode = normalizeCountryCode(resolved.countryCode);
  if (!COUNTRY_BY_CODE[countryCode]) notFound();
  const country = COUNTRY_BY_CODE[countryCode];
  return (
    <div className="h-full w-full relative">
      <BreadcrumbJsonLd countryName={country.name} countryCode={countryCode} />
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-6 text-center bg-[#0a0f1a]">
        <h1 className="text-4xl font-bold mb-4 text-white">Radio Stations in {country.name}</h1>
        <p className="text-white/70 max-w-2xl text-lg leading-relaxed mb-4">
          Listen to live internet radio stations broadcasting from {country.name}. Discover popular
          genres, trending stations, and local broadcasts from the {country.subregion} region.
        </p>
        <p className="text-white/50 max-w-xl text-sm leading-relaxed">
          Pulse Radio lets you explore radio from {country.name} and {country.region} with a
          real-time audio visualizer, album art, song history, and favorites.
        </p>
      </div>
      <div className="relative z-10 h-full">
        <Radio initialCountryCode={countryCode} />
      </div>
    </div>
  );
}
