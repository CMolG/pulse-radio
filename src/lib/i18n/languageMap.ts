/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
import type { SupportedLocale } from "./locales";
export const LANG3_TO_LOCALE: Record<string, SupportedLocale> = {
  eng: "en", spa: "es", fra: "fr", deu: "de", por: "pt", ita: "it", nld: "nl", jpn: "ja",
  kor: "ko", zho: "zh", ara: "ar", hin: "hi", ben: "bn", rus: "ru", ukr: "uk", pol: "pl",
  tur: "tr", swe: "sv", dan: "da", nor: "nb", fin: "fi", ell: "el", ces: "cs", hun: "hu",
  ron: "ro", tha: "th", vie: "vi", ind: "id", msa: "ms", fas: "fa", heb: "he", swa: "sw", tgl: "tl",
};
export const LOCALE_SELF_CANDIDATES: Record<SupportedLocale, SupportedLocale[]> = {
  en: ["en"], es: ["es"], fr: ["fr"], de: ["de"], "pt-BR": ["pt-BR", "pt"], pt: ["pt", "pt-BR"], it: ["it"], nl: ["nl"],
  ja: ["ja"], ko: ["ko"], zh: ["zh", "zh-TW"], "zh-TW": ["zh-TW", "zh"],
  ar: ["ar"], hi: ["hi"], bn: ["bn"], ru: ["ru", "uk"],
  uk: ["uk", "ru"], pl: ["pl"], tr: ["tr"], sv: ["sv", "da", "nb"],
  da: ["da", "sv", "nb"], nb: ["nb", "da", "sv"], fi: ["fi", "sv"], el: ["el"],
  cs: ["cs", "pl"], hu: ["hu", "ro"], ro: ["ro", "hu"], th: ["th"],
  vi: ["vi"], id: ["id", "ms"], ms: ["ms", "id"], fa: ["fa", "ar"],
  he: ["he", "ar"], sw: ["sw", "en"], tl: ["tl", "en"],
};
