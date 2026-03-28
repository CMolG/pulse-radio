/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { getLocaleFromCountryCode, getDirFromLocale } from '@/logic/i18n';

export default async function CountryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ countryCode: string }>;
}) {
  const { countryCode } = await params;
  const locale = getLocaleFromCountryCode(countryCode);
  const dir = getDirFromLocale(locale);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${locale}";document.documentElement.dir="${dir}";`,
        }}
      />
      {children}
    </>
  );
}
