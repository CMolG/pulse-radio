const ITUNES_REFERRER = "pt=pulse-radio&ct=www.pulse-radio.online";

export function stationInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function primaryArtist(artist: string): string {
  return artist.split(/[,;&]|feat\.|ft\.|featuring|vs\.?/i)[0].trim();
}

export function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function itunesSearchUrl(title: string, artist: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://music.apple.com/search?term=${q}&${ITUNES_REFERRER}`;
}
