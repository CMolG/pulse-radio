/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { COUNTRY_BY_CODE, isSovereignCountryCode, SOVEREIGN_COUNTRIES } from '@/logic/i18n/countries';
import { LANG3_TO_LOCALE, LOCALE_SELF_CANDIDATES, type SupportedLocale } from '@/logic/i18n/locales';
import { countryFlag } from '@/logic/format-utils';

export type CountryChip = {
  code: string;
  queryName: string;
  displayName: string;
  flag: string;
  reason: 'language' | 'proximity' | 'global';
};

const GLOBAL_INTEREST_CODES = ['US', 'GB', 'DE', 'FR', 'ES', 'BR', 'JP', 'KR', 'IN', 'CA', 'AU'];
const EXCLUDED_LOW_RELEVANCE_CODES = new Set([
  'AD',
  'SM',
  'LI',
  'MC',
  'VA',
  'KI',
  'TV',
  'NR',
  'PW',
  'MH',
  'FM',
  'TO',
  'WS',
  'VU',
]);
const REGION_PRIORITY: Record<string, number> = {
  Europe: 1,
  Asia: 2,
  Americas: 3,
  Africa: 4,
  Oceania: 5,
  Antarctic: 6,
  Other: 9,
};

function localeCandidates(locale: SupportedLocale): SupportedLocale[] {
  return LOCALE_SELF_CANDIDATES[locale] ?? [locale];
}

function localeFromLang3(code3: string): SupportedLocale | null {
  return LANG3_TO_LOCALE[code3] ?? null;
}

const _displayNamesCache = new Map<string, Intl.DisplayNames>();

export function getCountryDisplayName(locale: SupportedLocale, code: string): string {
  const country = COUNTRY_BY_CODE[code];
  if (!country) return code;
  try {
    let dn = _displayNamesCache.get(locale);
    if (!dn) {
      dn = new Intl.DisplayNames([locale], { type: 'region' });
      _displayNamesCache.set(locale, dn);
    }
    return dn.of(code) ?? country.name;
  } catch {
    return country.name;
  }
}

export function getSameLanguageCountries(locale: SupportedLocale): string[] {
  const candidates = new Set(localeCandidates(locale));
  const result: string[] = [];
  for (const country of SOVEREIGN_COUNTRIES) {
    for (const lang3 of country.lang3) {
      const mapped = localeFromLang3(lang3);
      if (mapped && candidates.has(mapped)) {
        result.push(country.code);
        break;
      }
    }
  }
  return result;
}

export function getProximityCountries(seedCodes: string[]): string[] {
  if (seedCodes.length === 0) return [];
  const seed: (typeof SOVEREIGN_COUNTRIES)[number][] = [];
  for (let i = 0; i < seedCodes.length; i++) {
    const c = COUNTRY_BY_CODE[seedCodes[i]];
    if (c) seed.push(c);
  }
  const regions = new Set<string>();
  const subregions = new Set<string>();
  const borders = new Set<string>();
  for (const country of seed) {
    if (country.region) regions.add(country.region);
    if (country.subregion) subregions.add(country.subregion);
    for (const b of country.borders) borders.add(b);
  }
  return SOVEREIGN_COUNTRIES.map((country) => {
    let score = 0;
    if (borders.has(country.code)) score += 100;
    if (subregions.has(country.subregion)) score += 60;
    if (regions.has(country.region)) score += 30;
    score += 30;
    score -= (REGION_PRIORITY[country.region] ?? REGION_PRIORITY.Other) * 0.05;
    return { code: country.code, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.code);
}

function uniquePush(target: string[], seen: Set<string>, values: string[]) {
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      target.push(value);
    }
  }
}

export function getCountryChipsForLocale(locale: SupportedLocale, maxChips = 36): CountryChip[] {
  const languageCodes = getSameLanguageCountries(locale);
  const proximityCodes = getProximityCountries(languageCodes);
  const ordered: string[] = [];
  const seen = new Set<string>();
  uniquePush(ordered, seen, languageCodes);
  uniquePush(ordered, seen, proximityCodes);
  uniquePush(ordered, seen, GLOBAL_INTEREST_CODES);
  const capped = ordered
    .filter((code) => COUNTRY_BY_CODE[code] && !EXCLUDED_LOW_RELEVANCE_CODES.has(code))
    .slice(0, maxChips);
  const languageSet = new Set(languageCodes);
  const proximitySet = new Set(proximityCodes);
  return capped.map((code) => {
    const country = COUNTRY_BY_CODE[code]!;
    const displayName = getCountryDisplayName(locale, code);
    const reason: CountryChip['reason'] = languageSet.has(code)
      ? 'language'
      : proximitySet.has(code)
        ? 'proximity'
        : 'global';
    return { code, queryName: country.name, displayName, flag: countryFlag(code), reason };
  });
}
