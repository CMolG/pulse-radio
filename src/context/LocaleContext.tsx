/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ 'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  LANG3_TO_LOCALE,
  SUPPORTED_LOCALES,
  isRtlLocale,
  normalizeLocale,
  translate,
  type MessageKey,
  type SupportedLocale,
} from '@/lib/i18n/locales';
import { COUNTRY_BY_CODE } from '@/lib/i18n/countries';
import { loadStringFromStorage, saveStringToStorage } from '@/lib/storageUtils';
const COUNTRY_LOCALE_OVERRIDES: Partial<Record<string, SupportedLocale>> = {
  BR: 'pt-BR',
  TW: 'zh-TW',
  HK: 'zh-TW',
  MO: 'zh-TW',
};
function getDefaultLocaleForCountry(countryCode: string): SupportedLocale | null {
  const normalized = countryCode.toUpperCase();
  const override = COUNTRY_LOCALE_OVERRIDES[normalized];
  if (override) return override;
  const country = COUNTRY_BY_CODE[normalized];
  if (!country) return null;
  for (const lang3 of country.lang3) {
    const locale = LANG3_TO_LOCALE[lang3];
    if (locale) return locale;
  }
  return null;
}
const LOCALE_STORAGE_KEY = 'radio-locale';
function getBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en';
  const nav = navigator as Navigator & { languages?: string[] };
  if (Array.isArray(nav.languages) && nav.languages.length > 0)
    return normalizeLocale(nav.languages[0]);
  return normalizeLocale(nav.language);
}
function getStoredLocale(): SupportedLocale | null {
  if (typeof window === 'undefined') return null;
  const raw = loadStringFromStorage(LOCALE_STORAGE_KEY, '');
  return raw ? normalizeLocale(raw) : null;
}
function getInitialLocale(): SupportedLocale {
  return getStoredLocale() ?? getBrowserLocale();
}
function getInitialLocaleForCountry(countryCode: string): SupportedLocale {
  return getStoredLocale() ?? getDefaultLocaleForCountry(countryCode) ?? getBrowserLocale();
}
function saveLocale(locale: SupportedLocale): void {
  if (typeof window === 'undefined') return;
  saveStringToStorage(LOCALE_STORAGE_KEY, locale);
}
type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;
type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: TranslateFn;
  rtl: boolean;
  locales: typeof SUPPORTED_LOCALES;
};
const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);
export function LocaleProvider({
  children,
  countryCode,
}: {
  children: React.ReactNode;
  countryCode?: string;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    countryCode ? getInitialLocaleForCountry(countryCode) : getInitialLocale(),
  );
  useEffect(() => {
    saveLocale(locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRtlLocale(locale) ? 'rtl' : 'ltr';
    }
  }, [locale]);
  const value = useMemo<LocaleContextValue>(() => {
    const t: TranslateFn = (key, vars) => translate(locale, key, vars);
    return {
      locale,
      setLocale: setLocaleState,
      t,
      rtl: isRtlLocale(locale),
      locales: SUPPORTED_LOCALES,
    };
  }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
}
