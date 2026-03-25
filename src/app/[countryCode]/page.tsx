/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Radio from "@/components/radio";
import { COUNTRY_BY_CODE, SOVEREIGN_COUNTRY_CODES } from "@/lib/i18n/countries";

type CountryPageProps = { params: Promise<{ countryCode: string }> };
const SITE_URL = "https://www.pulse-radio.online";

function normalizeCountryCode(raw: string): string { return raw.toUpperCase(); }

export async function generateStaticParams() { return SOVEREIGN_COUNTRY_CODES.map((countryCode) => ({ countryCode })); }

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const resolved = await params;
  const countryCode = normalizeCountryCode(resolved.countryCode);
  const country = COUNTRY_BY_CODE[countryCode];
  if (!country) return {};

  const title = `Top radio stations in ${country.name} (${countryCode})`;
  const description = `Listen to top internet radio stations in ${country.name}. Discover popular genres, trending stations, and live broadcasts for ${country.name}.`;
  const canonical = `${SITE_URL}/${countryCode}`;

  return {
    title,
    description,
    alternates: { canonical, },
    openGraph: { title, description, type: "website", url: canonical, siteName: "Pulse Radio", },
    twitter: { card: "summary", title, description, },
  };
}

export default async function CountryPage({ params }: CountryPageProps) {
  const resolved = await params;
  const countryCode = normalizeCountryCode(resolved.countryCode);
  if (!COUNTRY_BY_CODE[countryCode]) notFound();

  return (
    <div className="h-full w-full">
      <Radio initialCountryCode={countryCode} />
    </div>
  );
}
