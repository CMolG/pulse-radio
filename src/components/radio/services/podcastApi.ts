/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

export type Podcast = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600: string;
  feedUrl: string;
  genres: string[];
  trackCount: number;
  releaseDate: string;
  country: string;
};

export type PodcastEpisode = {
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string;
  duration: string;
  artworkUrl: string;
};

/**
 * Search podcasts via dedicated podcast search endpoint (uses iTunes API).
 * Legal: iTunes API is public and designed for podcast discovery.
 */
export async function searchPodcasts(query: string, limit = 20): Promise<Podcast[]> {
  const res = await fetch(
    `/api/podcast-search?${new URLSearchParams({ q: query, limit: String(limit) })}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return [];
  const data = await res.json();
  // Map new API shape back to Podcast type for backwards compatibility
  return (data.results || []).map((r: Record<string, unknown>) => ({
    collectionId: r.id,
    collectionName: r.name,
    artistName: r.author,
    artworkUrl600: r.artwork,
    feedUrl: r.feedUrl,
    genres: r.genres || [],
    trackCount: r.episodeCount || 0,
    releaseDate: r.lastRelease || '',
    country: '',
  })).slice(0, limit);
}

/**
 * Fetch episodes from a podcast RSS feed via our server-side parser.
 * Legal: Podcast RSS feeds are public by design — this is how all
 * podcast apps (Apple Podcasts, Spotify, etc.) discover episodes.
 */
export async function fetchPodcastEpisodes(feedUrl: string): Promise<PodcastEpisode[]> {
  const res = await fetch(
    `/api/podcast-feed?url=${encodeURIComponent(feedUrl)}`,
    { signal: AbortSignal.timeout(12_000) },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.episodes || [];
}
