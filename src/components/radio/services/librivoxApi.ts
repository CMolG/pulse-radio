/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

export type LibriVoxBook = {
  id: string;
  title: string;
  description: string;
  author: string;
  url: string;
  rssUrl: string;
  totalTime: string;
  chapters: number;
};

/**
 * Search LibriVox for public-domain audiobooks.
 * All results are legal, free, and in the public domain.
 */
export async function searchAudiobooks(
  query: string,
  limit = 20,
): Promise<LibriVoxBook[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `/api/librivox?q=${encodeURIComponent(query)}&limit=${limit}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

/**
 * Fetch chapters for an audiobook via its RSS feed.
 * Reuses the existing podcast-feed endpoint since LibriVox RSS
 * follows standard podcast RSS format.
 */
export async function fetchAudiobookChapters(rssUrl: string) {
  const { fetchPodcastEpisodes } = await import('./podcastApi');
  return fetchPodcastEpisodes(rssUrl);
}
