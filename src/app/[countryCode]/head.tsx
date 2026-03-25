/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
import { COUNTRY_BY_CODE } from "@/lib/i18n/countries";
type CountryHeadProps = { params: Promise<{ countryCode: string }> };
export default async function Head({ params }: CountryHeadProps) {
  const resolved = await params; const countryCode = resolved.countryCode.toUpperCase();
  const country = COUNTRY_BY_CODE[countryCode]; if (!country) return null;
  const title = `Top radio stations in ${country.name} (${countryCode})`;
  const description = `Listen to top internet radio stations in ${country.name}. Popular live stations and genres tailored for ${country.name}.`;
  return ( <><title>{title}</title><meta name="description" content={description} />
      <meta name="geo.region" content={countryCode} /> <meta name="geo.placename" content={country.name} />
      <meta property="og:locale" content="en_US" /> <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <link rel="canonical" href={`https://www.pulse-radio.online/${countryCode}`} /></>
  );
}
