export type Station = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  country: string;
  countrycode: string;
  tags: string;
  votes: number;
  codec: string;
  bitrate: number;
  language?: string;
  homepage?: string;
};

export type NowPlayingTrack = {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  itunesUrl?: string;
};

export type LyricLine = {
  time: number;
  text: string;
};

export type LyricsData = {
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  synced: boolean;
  lines: LyricLine[];
  plainText?: string;
};

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export type PlaybackState = {
  station: Station | null;
  status: PlaybackStatus;
  volume: number;
  muted: boolean;
  track: NowPlayingTrack | null;
  errorMessage?: string;
};

export type EqBand = {
  id: string;
  frequency: number;
  type: BiquadFilterType;
  gain: number;
  label: string;
};

export type EqPreset = {
  name: string;
  gains: number[];
};

export type FavoriteStation = Station;

export type RecentStation = Station;

export type SidebarSection = 'favorites' | 'recent' | 'browse';

export type BrowseCategory = {
  id: string;
  label: string;
  tag?: string;
  country?: string;
  gradient: string;
};

export type ViewState = {
  mode: 'top' | 'search' | 'genre' | 'country';
  query: string;
  tag: string;
  country: string;
  label: string;
};

export type LrcLibResponse = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

export type HistoryEntry = {
  id: string;
  stationName: string;
  stationUuid: string;
  artist: string;
  title: string;
  album?: string;
  artworkUrl?: string;
  itunesUrl?: string;
  timestamp: number;
};

export type WidgetPlaybackState = {
  station: Station | null;
  status: PlaybackStatus;
  track: NowPlayingTrack | null;
  volume: number;
  updatedAt: number;
};

export type FavoriteSong = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  itunesUrl?: string;
  stationName: string;
  stationUuid: string;
  timestamp: number;
};
