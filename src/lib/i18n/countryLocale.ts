/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { LANG3_TO_LOCALE, isRtlLocale, type SupportedLocale } from './locales';
import { COUNTRY_BY_CODE } from './countries';

const COUNTRY_LOCALE_OVERRIDES: Partial<Record<string, SupportedLocale>> = {
  BR: 'pt-BR',
  TW: 'zh-TW',
  HK: 'zh-TW',
  MO: 'zh-TW',
};

/** Server-safe: derive locale from ISO 3166-1 alpha-2 country code. */
export function getLocaleFromCountryCode(countryCode: string): SupportedLocale {
  const normalized = countryCode.toUpperCase();
  const override = COUNTRY_LOCALE_OVERRIDES[normalized];
  if (override) return override;
  const country = COUNTRY_BY_CODE[normalized];
  if (!country) return 'en';
  for (const lang3 of country.lang3) {
    const locale = LANG3_TO_LOCALE[lang3];
    if (locale) return locale;
  }
  return 'en';
}

/** Server-safe: derive text direction from locale. */
export function getDirFromLocale(locale: SupportedLocale): 'rtl' | 'ltr' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}
