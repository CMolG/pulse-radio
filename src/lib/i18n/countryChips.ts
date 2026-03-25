/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
import { countryFlag } from "@/components/radio/constants";
import { COUNTRY_BY_CODE, SOVEREIGN_COUNTRIES } from "./countries";
import { LANG3_TO_LOCALE, LOCALE_SELF_CANDIDATES } from "./languageMap";
import type { SupportedLocale } from "./locales";
export type CountryChip = {
  code: string; queryName: string; displayName: string; flag: string; reason: "language" | "proximity" | "global";
};
const GLOBAL_INTEREST_CODES = ["US", "GB", "DE", "FR", "ES", "BR", "JP", "KR", "IN", "CA", "AU"];
const EXCLUDED_LOW_RELEVANCE_CODES = new Set([ "AD", "SM", "LI", "MC", "VA", "KI", "TV", "NR", "PW", "MH", "FM", "TO",
  "WS", "VU",]);
const REGION_PRIORITY: Record<string, number> = {
  Europe: 1, Asia: 2, Americas: 3, Africa: 4, Oceania: 5, Antarctic: 6, Other: 9,
};
function localeCandidates(locale: SupportedLocale): SupportedLocale[] {
  return LOCALE_SELF_CANDIDATES[locale] ?? [locale];
}
function localeFromLang3(code3: string): SupportedLocale | null { return LANG3_TO_LOCALE[code3] ?? null; }
export function getCountryDisplayName(locale: SupportedLocale, code: string): string {
  const country = COUNTRY_BY_CODE[code]; if (!country) return code;
  try { const dn = new Intl.DisplayNames([locale], { type: "region" }); return dn.of(code) ?? country.name;
  } catch { return country.name; }
}
function getSameLanguageCountries(locale: SupportedLocale): string[] {
  const candidates = new Set(localeCandidates(locale));
  return SOVEREIGN_COUNTRIES.filter((country) =>country.lang3.some((lang3) => {
      const mapped = localeFromLang3(lang3); return mapped ? candidates.has(mapped) : false;
    }), ).map((country) => country.code);
}
function getProximityCountries(seedCodes: string[]): string[] {
  if (seedCodes.length === 0) return []; const seed = seedCodes .map((code) => COUNTRY_BY_CODE[code]).filter(Boolean);
  const regions = new Set(seed.map((country) => country.region));
  const subregions = new Set(seed.map((country) => country.subregion));
  const borders = new Set(seed.flatMap((country) => country.borders));
  return SOVEREIGN_COUNTRIES.map((country) => { let score = 0; if (borders.has(country.code)) score += 100;
    if (subregions.has(country.subregion)) score += 60; if (regions.has(country.region)) score += 30;
    score += 30; score -= (REGION_PRIORITY[country.region] ?? REGION_PRIORITY.Other) * 0.05;
    return { code: country.code, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.code);
}
function uniquePush(target: string[], values: string[]) {
  for (const value of values) { if (!target.includes(value)) target.push(value); }
}
export function getCountryChipsForLocale(locale: SupportedLocale, maxChips = 36): CountryChip[] {
  const languageCodes = getSameLanguageCountries(locale); const proximityCodes = getProximityCountries(languageCodes);
  const ordered: string[] = []; uniquePush(ordered, languageCodes);
  uniquePush(ordered, proximityCodes); uniquePush(ordered, GLOBAL_INTEREST_CODES);
  const capped = ordered
    .filter((code) => COUNTRY_BY_CODE[code] && !EXCLUDED_LOW_RELEVANCE_CODES.has(code)).slice(0, maxChips);
  const languageSet = new Set(languageCodes); const proximitySet = new Set(proximityCodes);
  return capped.map((code) => {
    const country = COUNTRY_BY_CODE[code]!; const displayName = getCountryDisplayName(locale, code);
    const reason: CountryChip["reason"] = languageSet.has(code)? "language"
      : proximitySet.has(code) ? "proximity" : "global";
    return { code, queryName: country.name, displayName, flag: countryFlag(code), reason };});
}
