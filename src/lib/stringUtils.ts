const DIACRITIC_RE = /[\u0300-\u036f]/g;
const NON_ALPHANUM_RE = /[^a-zA-Z0-9\s']/g;
const WHITESPACE_RE = /\s+/g;

export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value .normalize("NFKD")
    .replace(DIACRITIC_RE, "")
    .replace(NON_ALPHANUM_RE, " ")
    .replace(WHITESPACE_RE, " ")
    .trim()
    .toLowerCase();
}
