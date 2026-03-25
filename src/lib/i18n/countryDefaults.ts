/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { COUNTRY_BY_CODE } from "./countries"; import { LANG3_TO_LOCALE } from "./languageMap"; import type { SupportedLocale } from "./locales"; const COUNTRY_LOCALE_OVERRIDES: Partial<Record<string, SupportedLocale>> = {
  BR: "pt-BR", TW: "zh-TW", HK: "zh-TW", MO: "zh-TW", };
export function getDefaultLocaleForCountry(countryCode: string): SupportedLocale | null {
  const normalized = countryCode.toUpperCase(); const override = COUNTRY_LOCALE_OVERRIDES[normalized]; if (override) return override; const country = COUNTRY_BY_CODE[normalized]; if (!country) return null;
  for (const lang3 of country.lang3) { const locale = LANG3_TO_LOCALE[lang3]; if (locale) return locale; } return null; }
