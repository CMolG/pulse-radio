export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
