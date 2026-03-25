/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
const _LOCALES = [ { code: "en", nativeName: "English", englishName: "English" },
  { code: "es", nativeName: "Español", englishName: "Spanish" }, { code: "fr", nativeName: "Français", englishName: "French" },
  { code: "de", nativeName: "Deutsch", englishName: "German" }, { code: "pt-BR", nativeName: "Português (Brasil)", englishName: "Portuguese (Brazil)" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese" }, { code: "it", nativeName: "Italiano", englishName: "Italian" },
  { code: "nl", nativeName: "Nederlands", englishName: "Dutch" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese" }, { code: "ko", nativeName: "한국어", englishName: "Korean" },
  { code: "zh", nativeName: "中文（简体）", englishName: "Chinese (Simplified)" }, { code: "zh-TW", nativeName: "中文（繁體）", englishName: "Chinese (Traditional)" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", rtl: true }, { code: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali" }, { code: "ru", nativeName: "Русский", englishName: "Russian" },
  { code: "uk", nativeName: "Українська", englishName: "Ukrainian" }, { code: "pl", nativeName: "Polski", englishName: "Polish" },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish" }, { code: "sv", nativeName: "Svenska", englishName: "Swedish" },
  { code: "da", nativeName: "Dansk", englishName: "Danish" }, { code: "nb", nativeName: "Norsk bokmål", englishName: "Norwegian Bokmål" },
  { code: "fi", nativeName: "Suomi", englishName: "Finnish" }, { code: "el", nativeName: "Ελληνικά", englishName: "Greek" },
  { code: "cs", nativeName: "Čeština", englishName: "Czech" }, { code: "hu", nativeName: "Magyar", englishName: "Hungarian" },
  { code: "ro", nativeName: "Română", englishName: "Romanian" }, { code: "th", nativeName: "ไทย", englishName: "Thai" },
  { code: "vi", nativeName: "Tiếng Việt", englishName: "Vietnamese" }, { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian" },
  { code: "ms", nativeName: "Bahasa Melayu", englishName: "Malay" }, { code: "fa", nativeName: "فارسی", englishName: "Persian", rtl: true },
  { code: "he", nativeName: "עברית", englishName: "Hebrew", rtl: true }, { code: "sw", nativeName: "Kiswahili", englishName: "Swahili" },
  { code: "tl", nativeName: "Filipino", englishName: "Filipino" }, ] as const;
export type SupportedLocale = (typeof _LOCALES)[number]['code'];
export type LocaleInfo = { code: SupportedLocale; nativeName: string; englishName: string; rtl?: boolean; };
export const SUPPORTED_LOCALES: readonly LocaleInfo[] = _LOCALES;
const SUPPORTED_SET = new Set<SupportedLocale>(SUPPORTED_LOCALES.map((locale) => locale.code),);
export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_SET.has(value as SupportedLocale); }
const BASE_LOCALE_MAP: Record<string, SupportedLocale> = {
  en: "en", es: "es", fr: "fr", de: "de", pt: "pt", it: "it", nl: "nl", ja: "ja",
  ko: "ko", zh: "zh", ar: "ar", hi: "hi", bn: "bn", ru: "ru", uk: "uk", pl: "pl",
  tr: "tr", sv: "sv", da: "da", nb: "nb", no: "nb", fi: "fi", el: "el", cs: "cs",
  hu: "hu", ro: "ro", th: "th", vi: "vi", id: "id", ms: "ms", fa: "fa", he: "he", sw: "sw", tl: "tl", fil: "tl", };
export function normalizeLocale(input: string | null | undefined): SupportedLocale {
  if (!input) return "en"; const normalized = input.replace(/_/g, "-").trim();
  if (isSupportedLocale(normalized)) return normalized; const lower = normalized.toLowerCase(); if (lower === "pt-br") return "pt-BR";
  if (lower === "zh-tw" || lower === "zh-hk" || lower === "zh-mo") return "zh-TW"; const base = lower.split("-")[0]; return BASE_LOCALE_MAP[base] ?? "en"; }
export function isRtlLocale(locale: SupportedLocale): boolean {
  const info = SUPPORTED_LOCALES.find((item) => item.code === locale); return Boolean(info?.rtl); }
