/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

export type {
  Station,
  NowPlayingTrack,
  SongDetailData,
  HistoryEntry,
  FavoriteSong,
} from './schemas';

export type {
  LyricLine,
  LyricsData,
  PlaybackStatus,
  PlaybackState,
  EqBand,
  EqPreset,
  BrowseCategory,
  ViewState,
  LrcLibResponse,
  ArtistInfo,
  NoiseReductionMode,
  StationListenTime,
  SongPlayCount,
  ArtistPlayCount,
  GenrePlayCount,
} from './constants';

export type WidgetPlaybackState = {
  station: {
    name: string;
    url_resolved: string;
  } | null;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  volume: number;
  muted: boolean;
  track: {
    title: string;
    artist: string;
    album?: string;
  } | null;
};
