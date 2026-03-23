/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

export type ArchiveAudioResult = {
  id: string;
  title: string;
  description: string;
  creator: string;
  date: string | null;
  tags: string[];
  detailUrl: string;
  embedUrl: string;
  downloads: number;
  rating: number | null;
  collections: string[];
};

export type ArchiveCollection = {
  id: string;
  label: string;
};

export type ArchiveSearchResponse = {
  results: ArchiveAudioResult[];
  total: number;
  availableCollections: ArchiveCollection[];
};

/**
 * Search the Internet Archive for free, legal audio content.
 * Covers live music, old-time radio, podcasts, community audio, and audiobooks.
 */
export async function searchArchiveAudio(
  query: string,
  collection?: string,
  limit = 20,
): Promise<ArchiveSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (collection) params.set('collection', collection);

  const res = await fetch(`/api/archive-audio?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Archive search failed: ${res.status}`);
  return res.json();
}
