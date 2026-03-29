import { useState, useCallback, useRef, useEffect } from 'react';
import type { Station } from '@/components/radio/constants';

interface UsageStats {
  topGenres?: Array<{ genre: string; count: number }>;
  topStations?: Array<{ uuid: string; count: number }>;
}

interface RecommendationResult {
  recommended: Station[];
  similarToCurrent: Station[];
  isLoading: boolean;
  refresh: () => void;
}

/** Extract top tags from a list of stations */
function extractTopTags(stations: Station[], limit = 5): string[] {
  const tagCounts = new Map<string, number>();
  for (const s of stations) {
    if (!s.tags) continue;
    for (const tag of s.tags.split(',')) {
      const t = tag.trim().toLowerCase();
      if (t) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/** Score a station based on tag overlap and popularity */
function scoreStation(station: Station, preferredTags: Set<string>): number {
  let score = 0;
  if (station.tags) {
    for (const tag of station.tags.split(',')) {
      if (preferredTags.has(tag.trim().toLowerCase())) score += 10;
    }
  }
  score += Math.min(station.votes / 100, 5);
  if (station.bitrate >= 128) score += 2;
  return score;
}

/**
 * Content-based station recommendation engine.
 * Scores stations by tag overlap with user preferences, popularity, and bitrate.
 */
export function useSmartRecommendations(
  stats: UsageStats | null,
  favoriteStations: Station[],
  allStations: Station[],
  currentStation?: Station | null,
): RecommendationResult {
  const [recommended, setRecommended] = useState<Station[]>([]);
  const [similarToCurrent, setSimilarToCurrent] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, Station[]>>(new Map());

  const compute = useCallback(() => {
    setIsLoading(true);

    const favUuids = new Set(favoriteStations.map((s) => s.stationuuid));

    // Build preferred tags from favorites + stats
    const topTags = extractTopTags(favoriteStations);
    const statsGenres = (stats?.topGenres || []).slice(0, 5).map((g) => g.genre.toLowerCase());
    const preferredTags = new Set([...topTags, ...statsGenres]);

    if (preferredTags.size === 0) {
      setRecommended([]);
      setIsLoading(false);
      return;
    }

    // Score and rank non-favorite stations
    const candidates = allStations
      .filter((s) => !favUuids.has(s.stationuuid))
      .map((s) => ({ station: s, score: scoreStation(s, preferredTags) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((c) => c.station);

    setRecommended(candidates);
    setIsLoading(false);
  }, [favoriteStations, allStations, stats]);

  // Compute similar to current station
  useEffect(() => {
    if (!currentStation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSimilarToCurrent([]);
      return;
    }

    const cached = cacheRef.current.get(currentStation.stationuuid);
    if (cached) {
      setSimilarToCurrent(cached);
      return;
    }

    const currentTags = new Set(
      (currentStation.tags || '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    );
    if (currentTags.size === 0) {
      setSimilarToCurrent([]);
      return;
    }

    const similar = allStations
      .filter((s) => s.stationuuid !== currentStation.stationuuid)
      .map((s) => ({ station: s, score: scoreStation(s, currentTags) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((c) => c.station);

    cacheRef.current.set(currentStation.stationuuid, similar);
    setSimilarToCurrent(similar);
  }, [currentStation, allStations]);

  return { recommended, similarToCurrent, isLoading, refresh: compute };
}

export { extractTopTags, scoreStation };
