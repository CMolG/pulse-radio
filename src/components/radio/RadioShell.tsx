'use client';
/* eslint-disable react-hooks/rules-of-hooks */
/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Heart,
  Radio as RadioIcon,
  Clock,
  Search,
  Settings,
  Minimize2,
  Maximize2,
} from 'lucide-react';

/* ── Logic modules ────────────────────────────────────────────────── */
import { _NOOP, primaryArtist, cleanFeatFromTitle, buildStationShareUrl } from '@/logic/format-utils';
import {
  AlbumInfo,
  ItunesResult,
  CACHE,
  selectBestItunesResult,
  appendReferrer,
  preloadImage,
} from '@/logic/itunes-api';
import { similarStations, fetchStationByUuid } from '@/logic/radio-api';
import { isIOSDevice } from '@/logic/station-meta';
import { resumeAudioContext } from '@/logic/audio-context';
import { usePlaybackStore } from '@/logic/playback-store';
import { installDevFetchLogger } from '@/logic/dev-api-logger';
import { getCountryDisplayName } from '@/logic/country-chips';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import { COUNTRY_BY_CODE, isSovereignCountryCode } from '@/logic/i18n/countries';

/* ── Types & constants ────────────────────────────────────────────── */
import type {
  Station,
  NowPlayingTrack,
  ViewState,
  BrowseCategory,
  FavoriteSong,
  SongDetailData,
  HistoryEntry,
} from './constants';
import { STORAGE_KEYS, GENRE_LABEL_KEYS } from './constants';

/* ── Context ──────────────────────────────────────────────────────── */
import { useLocale } from '@/context/LocaleContext';

/* ── Hooks ────────────────────────────────────────────────────────── */
import { useRadio } from './hooks/useRadio';
import { useEqualizer } from './hooks/useEqualizer';
import { useAlbumArt } from './hooks/useAlbumArt';
import { useLyrics } from './hooks/useLyrics';
import { useStationMeta } from './hooks/useStationMeta';
import { useConcerts } from './hooks/useConcerts';
import { useStats } from './hooks/useStats';
import { useAudioAnalyser } from './hooks/useAudioAnalyser';
import { useFavorites } from './hooks/useFavorites';
import { useFavoriteSongs } from './hooks/useFavoriteSongs';
import { useHistory } from './hooks/useHistory';
import { useMediaSession } from './hooks/useMediaSession';
import { useRecent } from './hooks/useRecent';
import { useSleepTimer } from './hooks/useSleepTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { useStationQueue } from './hooks/useStationQueue';
import { useContainerSize } from './hooks/useContainerSize';
import { useAudioReactiveBackground } from './hooks/useAudioReactiveBackground';

/* ── Components ───────────────────────────────────────────────────── */
import { NowPlayingBar } from './components/NowPlayingBar';
import EqPanel from './components/modals/EqPanel';
import { UiImage } from './components/UiImage';
import NowPlayingHero from './components/NowPlayingHero';
import ParallaxBackground from '@/components/radio/components/visuals/ParallaxBackground';
import LanguageSelector from './components/buttons/LanguageSelector';
import LiquidGlassSvgFilter from '@/components/radio/components/visuals/LiquidGlassSvgFilter';
import { SongDetailModal } from './components/modals/SongDetailModal';
import OnboardingModal from './components/modals/OnboardingModal';
import KeyboardShortcutsHelp from './components/modals/KeyboardShortcutsHelp';
import { ConcertMobileBanner } from './components/concerts/ConcertMobileBanner';
import { ConcertModal } from './components/concerts/ConcertModal';
import DevApiConsole from './components/dev/DevApiConsole';
import ApiPlayground from './components/dev/ApiPlayground';

/* ── Views ────────────────────────────────────────────────────────── */
import BrowseView from './views/BrowseView';
import TheaterView from './views/TheaterView';
import MobileSettingsPanel from './views/MobileSettingsPanel';
import FavoriteSongsView from './views/FavoriteSongsView';
import HistoryGridView from './views/HistoryGridView';

/* ── Re-exports for backwards compatibility ───────────────────────── */
export {
  stationInitials,
  formatDuration,
  formatReleaseDate,
  itunesSearchUrl,
  buildStationShareUrl,
  _SAFE_AREA_BOTTOM_STYLE,
  _NOOP,
} from '@/logic/format-utils';
export { LiquidGlassButton } from './components/buttons/LiquidGlassButton';
export { AnimatedBars } from '@/components/radio/components/visuals/AnimatedBars';
export { UiImage } from './components/UiImage';
export { FerrofluidRenderer } from '@/components/radio/components/visuals/FerrofluidRenderer';
export type { StreamQuality } from './hooks/useRadio';
export { useConcerts } from './hooks/useConcerts';
export { useAlbumArt } from './hooks/useAlbumArt';
export { useLyrics } from './hooks/useLyrics';

/* ── Local constants used only by the orchestrator ────────────────── */
const _MOTION_FADE_IN = { opacity: 0 } as const;
const _MOTION_FADE_VISIBLE = { opacity: 1 } as const;
const _MOTION_FADE_OUT = { opacity: 0 } as const;
const _MOTION_T_03 = { duration: 0.3 } as const;

const _EQ_ALLOWED_KEYS = new Set([
  ' ',
  'Escape',
  'e',
  'E',
  'r',
  'R',
  'ArrowUp',
  'ArrowDown',
  'm',
  'M',
]);

type LayoutMode = 'desktop' | 'mobile' | 'pip';

function buildFavInput(
  t: NowPlayingTrack,
  s: Station,
): Omit<FavoriteSong, 'id' | 'timestamp'> {
  return { ...t, artist: t.artist ?? '', stationName: s.name, stationUuid: s.stationuuid };
}

function mkView(
  mode: ViewState['mode'],
  label: string,
  overrides?: Partial<ViewState>,
): ViewState {
  return { mode, query: '', tag: '', countryCode: '', countryQueryName: '', label, ...overrides };
}

/* ═══════════════════════════════════════════════════════════════════
 *  RadioShell — thin orchestrator
 * ═══════════════════════════════════════════════════════════════════ */
type RadioShellProps = { isPip?: boolean; initialCountryCode?: string };

export default function RadioShell({ isPip: isPipProp, initialCountryCode }: RadioShellProps) {
  /* ── Bootstrap ─────────────────────────────────────────────────── */
  useEffect(() => {
    installDevFetchLogger();
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const layout: LayoutMode = isPipProp ? 'pip' : containerSize.w <= 640 ? 'mobile' : 'desktop';

  /* ── Effects toggle ────────────────────────────────────────────── */
  const [effectsEnabled, setEffectsEnabled] = useState(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.EFFECTS_ENABLED, false),
  );
  const effectsEnabledRef = useRef(effectsEnabled);
  effectsEnabledRef.current = effectsEnabled;

  /* ── Core hooks ────────────────────────────────────────────────── */
  const radio = useRadio(effectsEnabledRef);
  const eq = useEqualizer();
  const { track, icyBitrate, stationBlacklisted } = useStationMeta(
    radio.station,
    radio.status === 'playing',
  );
  const {
    lyrics,
    effectiveCurrentTime,
    realtime: realtimeLyrics,
  } = useLyrics(track, radio.station?.name, {
    currentTime: radio.currentTime,
    enableRealtime: Boolean(track?.title),
    languageHint: locale === 'es' ? 'es' : 'en',
  });
  const favs = useFavorites();
  const favSongs = useFavoriteSongs();
  const recent = useRecent();
  const sleepTimer = useSleepTimer(radio.pause, radio.audioRef);
  const stationQueue = useStationQueue();
  useWakeLock(radio.status === 'playing');
  const analyser = useAudioAnalyser({ fftSize: 2048, smoothingTimeConstant: 0.8 });
  const bgAudio = useAudioReactiveBackground(
    analyser.meterRef,
    radio.status === 'playing',
    analyser.isActive,
  );
  const albumArt = useAlbumArt(track?.title ?? null, track?.artist ?? null);

  /* ── Lyrics → iTunes fallback ──────────────────────────────────── */
  const [lyricsRetryArt, setLyricsRetryArt] = useState<AlbumInfo | null>(null);
  const lyricsRetryKeyRef = useRef<string>('');

  useEffect(() => {
    setLyricsRetryArt(null);
    lyricsRetryKeyRef.current = '';
  }, [track?.title, track?.artist]);

  useEffect(() => {
    if (albumArt.isLoading || albumArt.artworkUrl !== null) return;
    if (!lyrics?.lyricsEnriched || !lyrics.artistName || !lyrics.trackName) return;
    const retryKey = `${lyrics.artistName}\n${lyrics.trackName}`.toLowerCase();
    if (lyricsRetryKeyRef.current === retryKey) return;
    lyricsRetryKeyRef.current = retryKey;
    const controller = new AbortController();
    const cleanArtist = primaryArtist(lyrics.artistName);

    function applyResult(result: ItunesResult) {
      const artworkUrl = result.artworkUrl100?.replace('100x100', '600x600') ?? null;
      const rawItunesUrl: string | null = result.trackViewUrl ?? result.collectionViewUrl ?? null;
      const info: AlbumInfo = {
        artworkUrl,
        albumName: result.collectionName ?? null,
        releaseDate: result.releaseDate ?? null,
        itunesUrl: rawItunesUrl ? appendReferrer(rawItunesUrl) : null,
        durationMs: typeof result.trackTimeMillis === 'number' ? result.trackTimeMillis : null,
        genre: result.primaryGenreName ?? null,
        trackNumber: typeof result.trackNumber === 'number' ? result.trackNumber : null,
        trackCount: typeof result.trackCount === 'number' ? result.trackCount : null,
      };
      CACHE.set(retryKey, info);
      if (track) {
        const origKey = `${track.artist ?? ''}\n${track.title}`.toLowerCase();
        if (origKey !== retryKey) CACHE.set(origKey, info);
      }
      if (artworkUrl) preloadImage(artworkUrl);
      setLyricsRetryArt(info);
    }

    async function fetchByAlbum(): Promise<boolean> {
      if (!lyrics?.albumName) return false;
      const albumTerm = `${cleanArtist} ${lyrics.albumName}`;
      const albumRes = await fetch(
        `/api/itunes?term=${encodeURIComponent(albumTerm)}&entity=album`,
        { signal: controller.signal },
      );
      if (!albumRes.ok || controller.signal.aborted) return false;
      const albumData = await albumRes.json();
      const albumResult = (albumData.results ?? []) as ItunesResult[];
      const collectionId = albumResult[0]?.collectionId;
      if (!collectionId) return false;
      const tracksRes = await fetch(`/api/itunes/lookup?id=${collectionId}`, {
        signal: controller.signal,
      });
      if (!tracksRes.ok || controller.signal.aborted) return false;
      const tracksData = await tracksRes.json();
      const best = selectBestItunesResult(
        (tracksData.results ?? []) as ItunesResult[],
        lyrics!.trackName,
        lyrics!.artistName,
      );
      if (!best) return false;
      applyResult(best);
      return true;
    }

    fetchByAlbum()
      .then((found) => {
        if (found || controller.signal.aborted) return;
        const cleanTitle = cleanFeatFromTitle(lyrics!.trackName);
        const term = `${cleanArtist} ${cleanTitle}`;
        return fetch(`/api/itunes?term=${encodeURIComponent(term)}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data || controller.signal.aborted) return;
            const result = selectBestItunesResult(
              (data.results ?? []) as ItunesResult[],
              lyrics!.trackName,
              lyrics!.artistName,
            );
            if (result) applyResult(result);
          });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [
    albumArt.isLoading,
    albumArt.artworkUrl,
    lyrics?.lyricsEnriched,
    lyrics?.artistName,
    lyrics?.trackName,
    lyrics?.albumName,
  ]);

  /* ── Stats & enriched track ────────────────────────────────────── */
  const usageStats = useStats();

  const enrichedTrack = useMemo(() => {
    if (!track) return null;
    const artSource = albumArt.artworkUrl ? albumArt : (lyricsRetryArt ?? albumArt);
    return {
      ...track,
      artist: track.artist || (lyrics?.artistName ?? track.artist),
      album: track.album || artSource.albumName || lyrics?.albumName || undefined,
      artworkUrl: track.artworkUrl || artSource.artworkUrl || undefined,
      itunesUrl: artSource.itunesUrl ?? undefined,
      durationMs: artSource.durationMs ?? undefined,
      genre: artSource.genre || undefined,
      releaseDate: artSource.releaseDate || undefined,
      trackNumber: artSource.trackNumber ?? undefined,
      trackCount: artSource.trackCount ?? undefined,
    };
  }, [track, albumArt, lyricsRetryArt, lyrics?.artistName, lyrics?.albumName]);

  const songHistory = useHistory(radio.station?.name, radio.station?.stationuuid, enrichedTrack);

  /* ── Listen-time ticker ────────────────────────────────────────── */
  const lastTickRef = useRef<number>(null!);
  if (lastTickRef.current === null) lastTickRef.current = Date.now();
  const { tickListenTime } = usageStats;

  useEffect(() => {
    if (radio.status !== 'playing' || !radio.station) {
      lastTickRef.current = Date.now();
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (radio.station) tickListenTime(radio.station.stationuuid, radio.station.name, delta);
    }, 5000);
    lastTickRef.current = Date.now();
    return () => clearInterval(interval);
  }, [radio.status, radio.station, tickListenTime]);

  /* ── Song play recording ───────────────────────────────────────── */
  const lastRecordedTrackRef = useRef<string | null>(null);
  const { recordSongPlay, updateSongMeta } = usageStats;

  useEffect(() => {
    if (!enrichedTrack?.title || !enrichedTrack?.artist) return;
    const key = `${enrichedTrack.title}|||${enrichedTrack.artist}`;
    if (key !== lastRecordedTrackRef.current) {
      lastRecordedTrackRef.current = key;
      recordSongPlay(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.genre,
        enrichedTrack.artworkUrl,
      );
    } else {
      updateSongMeta(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.genre,
        enrichedTrack.artworkUrl,
      );
    }
  }, [
    enrichedTrack?.title,
    enrichedTrack?.artist,
    enrichedTrack?.genre,
    enrichedTrack?.artworkUrl,
    recordSongPlay,
    updateSongMeta,
  ]);

  /* ── UI state ──────────────────────────────────────────────────── */
  const [showEq, setShowEq] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showDesktopSettings, setShowDesktopSettings] = useState(false);
  const [showConcertModal, setShowConcertModal] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  /* ── Toast ─────────────────────────────────────────────────────── */
  const [toast, setToast] = useState<{
    msg: string;
    icon: 'star' | 'heart' | 'info';
    key: number;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duckOrigVolRef = useRef<number | null>(null);
  const duckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, icon: 'star' | 'heart' | 'info') => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ msg, icon, key: Date.now() });
      const audio = radio.audioRef.current;
      if (audio && !audio.paused) {
        if (duckTimerRef.current) clearTimeout(duckTimerRef.current);
        if (duckOrigVolRef.current === null) duckOrigVolRef.current = audio.volume;
        audio.volume = duckOrigVolRef.current * 0.4;
        duckTimerRef.current = setTimeout(() => {
          if (audio && duckOrigVolRef.current !== null) audio.volume = duckOrigVolRef.current;
          duckOrigVolRef.current = null;
          duckTimerRef.current = null;
        }, 400);
      }
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    },
    [radio.audioRef],
  );

  useEffect(() => {
    if (duckOrigVolRef.current !== null) duckOrigVolRef.current = radio.muted ? 0 : radio.volume;
  }, [radio.volume, radio.muted]);

  /* ── EQ preset ─────────────────────────────────────────────────── */
  const [eqPreset, setEqPresetRaw] = useState<string | null>(() =>
    loadFromStorage<string | null>(STORAGE_KEYS.EQ_PRESET_NAME, null),
  );
  const setEqPreset = useCallback((name: string | null) => {
    setEqPresetRaw(name);
    saveToStorage(STORAGE_KEYS.EQ_PRESET_NAME, name);
  }, []);

  /* ── Navigation state ──────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<'discover' | 'history' | 'favorites'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<SongDetailData | null>(null);

  function countryView(code: string): ViewState {
    const country = COUNTRY_BY_CODE[code];
    return mkView('country', getCountryDisplayName(locale, code), {
      countryCode: code,
      countryQueryName: country?.name ?? '',
    });
  }

  const resetNav = useCallback((v: ViewState) => {
    setView(v);
    setActiveTab('discover');
    setTheaterMode(false);
    setSearchQuery('');
  }, []);

  const [view, setView] = useState<ViewState>(() => {
    const code = (initialCountryCode ?? '').toUpperCase();
    if (isSovereignCountryCode(code)) return countryView(code);
    return mkView('top', t('topStations'));
  });

  useEffect(() => {
    const newLabel =
      view.mode === 'top'
        ? t('topStations')
        : view.mode === 'country' && view.countryCode
          ? getCountryDisplayName(locale, view.countryCode)
          : null;
    if (newLabel && newLabel !== view.label) setView((prev) => ({ ...prev, label: newLabel }));
  }, [locale, t, view.countryCode, view.label, view.mode]);

  useEffect(() => {
    const code = (initialCountryCode ?? '').toUpperCase();
    if (!isSovereignCountryCode(code) || !COUNTRY_BY_CODE[code]) return;
    if (view.mode === 'country' && view.countryCode === code) return;
    resetNav(countryView(code));
  }, [initialCountryCode, locale, view.countryCode, view.mode, resetNav]);

  useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname;
      const segment = (p[0] === '/' ? p.slice(1) : p).toUpperCase();
      if (!segment) {
        resetNav(mkView('top', t('topStations')));
        return;
      }
      if (isSovereignCountryCode(segment) && COUNTRY_BY_CODE[segment])
        resetNav(countryView(segment));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [locale, t, resetNav]);

  useEffect(() => {
    if (layout === 'pip') setMiniMode(false);
  }, [layout]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* ── Playback store sync ───────────────────────────────────────── */
  const pbStore = usePlaybackStore;
  useEffect(() => {
    const state = pbStore.getState();
    state.setSource('radio');
    state.setPlaying(radio.status === 'playing');
    state.setVolume(radio.volume);
    state.setMuted(radio.muted);
    state.setCurrentTime(radio.currentTime);
    if (enrichedTrack) {
      state.setTrackInfo(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.artworkUrl ?? albumArt.artworkUrl,
      );
    }
  }, [
    radio.status,
    radio.volume,
    radio.muted,
    radio.currentTime,
    enrichedTrack,
    albumArt.artworkUrl,
    pbStore,
  ]);

  /* ── Audio pipeline wiring ─────────────────────────────────────── */
  const { setOutputVolume, connectSource: eqConnectSource } = eq;

  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      const ios = isIOSDevice();
      if (!ios || effectsEnabled) {
        analyser.connectAudio(radio.audioRef.current);
      }
      if (effectsEnabled) {
        analyser.disablePassthrough();
        eqConnectSource(radio.audioRef.current);
      } else {
        analyser.enablePassthrough(radio.audioRef.current);
      }
    }
  }, [radio.station, effectsEnabled]);

  useEffect(() => {
    if (effectsEnabled) {
      setOutputVolume(radio.volume, radio.muted);
      const audio = radio.audioRef.current;
      if (audio) audio.volume = 1;
    } else {
      setOutputVolume(1, false);
    }
  }, [setOutputVolume, effectsEnabled, radio.volume, radio.muted]);

  // iOS: resume AudioContext when returning to foreground
  useEffect(() => {
    if (!isIOSDevice()) return;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const audio = radio.audioRef.current;
      if (!audio) return;
      resumeAudioContext(audio);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [radio]);

  /* ── handlePlay ────────────────────────────────────────────────── */
  const handlePlayRef = useRef({ radio, recent, stationQueue, eqConnectSource, analyser });
  useEffect(() => {
    handlePlayRef.current = { radio, recent, stationQueue, eqConnectSource, analyser };
  }, [radio, recent, stationQueue, eqConnectSource, analyser]);

  const handlePlay = useCallback((station: Station) => {
    const {
      radio: r,
      recent: rec,
      stationQueue: sq,
      eqConnectSource: eqSrc,
      analyser: an,
    } = handlePlayRef.current;
    const audio = r.ensureAudio();
    if (!isIOSDevice() || effectsEnabledRef.current) {
      an.connectAudio(audio);
    }
    if (effectsEnabledRef.current) {
      eqSrc(audio);
    }
    r.play(station);
    rec.add(station);
    sq.setPlaying(station.stationuuid);
    setTheaterMode(true);
    const nextIdx = sq.queue.findIndex((s) => s.stationuuid === station.stationuuid) + 1;
    if (nextIdx > 0 && nextIdx < sq.queue.length) r.prefetchStream(sq.queue[nextIdx].url_resolved);
  }, []);

  /* ── Auto-tune from URL ────────────────────────────────────────── */
  const searchParams = useSearchParams();
  const autoTuneHandled = useRef(false);

  useEffect(() => {
    if (autoTuneHandled.current) return;
    const sid = searchParams.get('sid');
    if (!sid) return;
    autoTuneHandled.current = true;
    fetchStationByUuid(sid).then((station) => {
      if (station) {
        handlePlay(station);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('sid');
          url.searchParams.delete('tune');
          window.history.replaceState(
            {},
            '',
            url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ''),
          );
        }
      }
    });
  }, [searchParams, handlePlay]);

  /* ── Effects toggle ────────────────────────────────────────────── */
  const toggleEffects = useCallback(() => {
    setEffectsEnabled((prev) => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.EFFECTS_ENABLED, next);
      effectsEnabledRef.current = next;
      const { radio: r, eqConnectSource: eqSrc, analyser: an } = handlePlayRef.current;
      const station = r.station;
      if (!station || r.status === 'idle') return next;
      const audio = r.audioRef.current;
      if (next) {
        if (audio) {
          an.disablePassthrough();
          eqSrc(audio);
          an.connectAudio(audio);
        }
      } else {
        eq.disconnect();
        if (audio) {
          an.reconnect(audio);
        }
      }
      return next;
    });
  }, [eq]);

  /* ── Error recovery & skip ─────────────────────────────────────── */
  useEffect(() => {
    if (stationBlacklisted && radio.station) {
      showToast('This station is temporarily unavailable', 'info');
    }
  }, [stationBlacklisted, radio.station?.stationuuid]);

  useEffect(() => {
    let cancelled = false;
    if (radio.status === 'error') {
      if (stationQueue.hasNext) {
        const next = stationQueue.skipToNext();
        if (next) {
          radio.play(next);
          recent.add(next);
        }
      } else if (radio.station) {
        Promise.resolve({ similarStations }).then(({ similarStations }) => {
          similarStations(radio.station!, 3)
            .then((alts) => {
              if (alts.length > 0 && !cancelled) handlePlay(alts[0]);
            })
            .catch(_NOOP);
        });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [radio.status]);

  /* ── Skip next / prev ──────────────────────────────────────────── */
  const skipDepsRef = useRef({ radio, favs, stationQueue });
  useEffect(() => {
    skipDepsRef.current = { radio, favs, stationQueue };
  }, [radio, favs, stationQueue]);

  const handleSkipNext = useCallback(() => {
    const { stationQueue: sq, radio: r, favs: f } = skipDepsRef.current;
    if (sq.hasNext) {
      const next = sq.skipToNext();
      if (next) {
        handlePlay(next);
        return;
      }
    }
    if (r.station) {
      const next = f.playNext(r.station.stationuuid);
      if (next) handlePlay(next);
    }
  }, [handlePlay]);

  const handleSkipPrev = useCallback(() => {
    const { stationQueue: sq, radio: r, favs: f } = skipDepsRef.current;
    if (sq.hasPrev) {
      const prev = sq.skipToPrev();
      if (prev) {
        handlePlay(prev);
        return;
      }
    }
    if (r.station) {
      const prev = f.playPrev(r.station.stationuuid);
      if (prev) handlePlay(prev);
    }
  }, [handlePlay]);

  /* ── Media session ─────────────────────────────────────────────── */
  useMediaSession({
    station: radio.station,
    track: enrichedTrack,
    isPlaying: radio.status === 'playing',
    onPlay: radio.resume,
    onPause: radio.pause,
    onNext: handleSkipNext,
    onPrev: handleSkipPrev,
    onStop: radio.stop,
    onSeekBackward: () => radio.seek(Math.max(0, radio.currentTime - 10)),
    onSeekForward: () => radio.seek(radio.currentTime + 10),
  });

  /* ── Keyboard shortcuts ────────────────────────────────────────── */
  const keydownRef = useRef({
    radio,
    handleSkipNext,
    handleSkipPrev,
    favs,
    favSongs,
    enrichedTrack,
    theaterMode,
    showEq,
    showShortcuts,
    selectedSong,
    sleepTimer,
    showToast,
    realtimeLyrics,
  });
  useEffect(() => {
    keydownRef.current = {
      radio,
      handleSkipNext,
      handleSkipPrev,
      favs,
      favSongs,
      enrichedTrack,
      theaterMode,
      showEq,
      showShortcuts,
      selectedSong,
      sleepTimer,
      showToast,
      realtimeLyrics,
    };
  }, [
    radio,
    handleSkipNext,
    handleSkipPrev,
    favs,
    favSongs,
    enrichedTrack,
    theaterMode,
    showEq,
    showShortcuts,
    selectedSong,
    sleepTimer,
    showToast,
    realtimeLyrics,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const {
        radio: r,
        handleSkipNext: skipNext,
        handleSkipPrev: skipPrev,
        favs: f,
        favSongs: fs,
        enrichedTrack: et,
        theaterMode: tm,
        showEq: eq,
        showShortcuts: sc,
        selectedSong: ss,
        sleepTimer: st,
        showToast: toast,
        realtimeLyrics: rl,
      } = keydownRef.current;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput && e.key !== 'Escape') return;
      if (eq) {
        if (!_EQ_ALLOWED_KEYS.has(e.key)) return;
      }
      if (ss) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          r.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          r.setVolume(Math.min(1, r.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          r.setVolume(Math.max(0, r.volume - 0.05));
          break;
        case 'm':
        case 'M':
          r.toggleMute();
          break;
        case 'n':
        case 'N':
          skipNext();
          break;
        case 'p':
        case 'P':
          skipPrev();
          break;
        case 'f':
        case 'F': {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-radio-search], .radio-search-input',
          );
          if (searchInput) searchInput.focus();
          break;
        }
        case 's':
        case 'S':
          if (r.station) {
            const wasFav = f.has(r.station.stationuuid);
            f.toggle(r.station);
            toast(wasFav ? 'Removed from favorites' : r.station.name, 'star');
          }
          break;
        case 'Escape':
          if (sc) setShowShortcuts(false);
          else if (eq) setShowEq(false);
          else if (tm) setTheaterMode(false);
          break;
        case 't':
        case 'T':
          setTheaterMode((prev) => !prev);
          break;
        case 'e':
        case 'E':
          setShowEq((prev) => !prev);
          break;
        case 'l':
        case 'L':
          if (et?.title && r.station) {
            const wasLiked = fs.has(et.title, et.artist ?? '');
            fs.toggle(buildFavInput(et, r.station));
            toast(wasLiked ? 'Song removed' : et.title, 'heart');
          }
          break;
        case 'r':
        case 'R':
          if (rl) rl.toggle();
          break;
        case 'z':
        case 'Z':
        case '?':
          setShowShortcuts((prev) => !prev);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ── Favorite & song action handlers ───────────────────────────── */
  const isSongLiked = enrichedTrack?.title
    ? favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? '')
    : false;

  const handleToggleFav = useCallback(() => {
    if (!radio.station) return;
    const wasFav = favs.has(radio.station.stationuuid);
    favs.toggle(radio.station);
    showToast(wasFav ? 'Removed from favorites' : radio.station.name, 'star');
  }, [radio.station, favs, showToast]);

  const handleFavSong = useCallback(() => {
    if (!enrichedTrack?.title || !radio.station) return;
    const wasLiked = favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? '');
    favSongs.toggle(buildFavInput(enrichedTrack, radio.station));
    showToast(wasLiked ? 'Song removed' : enrichedTrack.title, 'heart');
  }, [enrichedTrack, radio.station, favSongs, showToast]);

  const handleFavSongFromHistory = useCallback(
    (entry: HistoryEntry) => {
      const wasLiked = favSongs.has(entry.title, entry.artist);
      const { id: _, timestamp: _t, ...input } = entry;
      favSongs.toggle(input);
      showToast(wasLiked ? 'Song removed' : entry.title, 'heart');
    },
    [favSongs, showToast],
  );

  /* ── Search & navigation handlers ──────────────────────────────── */
  const handleSearch = useCallback(
    (query: string) => {
      const sanitized = query.trim();
      setView(mkView('search', t('searchResultLabel', { query: sanitized }), { query: sanitized }));
      setActiveTab('discover');
      setTheaterMode(false);
    },
    [t],
  );

  const handleGoHome = useCallback(() => {
    resetNav(mkView('top', t('topStations')));
    if (pathname !== '/') window.history.pushState(null, '', '/');
  }, [pathname, t, resetNav]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) handleSearch(searchQuery.trim());
      else handleGoHome();
    },
    [searchQuery, handleSearch, handleGoHome],
  );

  const handleSelectGenre = useCallback(
    (cat: BrowseCategory) => {
      const key = GENRE_LABEL_KEYS[cat.id];
      setView(mkView('genre', key ? t(key) : cat.label, { tag: cat.tag || cat.id }));
      setTheaterMode(false);
      setSearchQuery('');
    },
    [t],
  );

  const handleSelectCountry = useCallback(
    (countryCode: string, countryQueryName: string, countryDisplayName: string) => {
      setView(mkView('country', countryDisplayName, { countryCode, countryQueryName }));
      setTheaterMode(false);
      setSearchQuery('');
      const newPath = `/${countryCode}`;
      if (pathname !== newPath) window.history.pushState(null, '', newPath);
    },
    [pathname],
  );

  /* ── Computed values ───────────────────────────────────────────── */
  const viewKey = `${view.mode}-${view.tag}-${view.query}-${view.countryCode}`;
  const isLandingNavigation = !theaterMode;

  const selectedFavSong = selectedSong
    ? (favSongs.songs.find(
        (s) => s.title === selectedSong.title && s.artist === selectedSong.artist,
      ) ?? null)
    : null;

  /* ── Pre-built elements ────────────────────────────────────────── */
  const songDetailModal = (
    <SongDetailModal
      song={selectedSong}
      onClose={() => setSelectedSong(null)}
      onRemoveFromFavorites={
        selectedFavSong
          ? () => {
              favSongs.remove(selectedFavSong.id);
              setSelectedSong(null);
            }
          : undefined
      }
    />
  );

  const shortcutsOverlay = showShortcuts ? (
    <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
  ) : null;

  const offlineBanner = !isOnline ? (
    <div
      className="fixed top-0 inset-x-0 z-[250] bg-yellow-600 text-white text-center text-[12px] font-medium py-1 select-none"
      role="alert"
    >
      {' '}
      {t('offlineBanner')}
    </div>
  ) : null;

  const eqPanelElement = showEq ? (
    <EqPanel
      bands={eq.bands}
      enabled={eq.enabled}
      normalizerEnabled={eq.normalizerEnabled}
      stereoWidth={eq.stereoWidth}
      bassEnhance={eq.bassEnhance}
      compressorEnabled={eq.compressorEnabled}
      compressorAmount={eq.compressorAmount}
      noiseReductionMode={eq.noiseReductionMode}
      customPresets={eq.customPresets}
      onSetGain={eq.setBandGain}
      onApplyPreset={eq.applyPreset}
      onToggleEnabled={eq.toggleEnabled}
      onToggleNormalizer={eq.toggleNormalizer}
      onSetStereoWidth={eq.setStereoWidth}
      onSetBassEnhance={eq.setBassEnhance}
      onToggleCompressor={eq.toggleCompressor}
      onSetCompressorAmount={eq.setCompressorAmount}
      onSetNoiseReductionMode={eq.setNoiseReductionMode}
      onSaveCustomPreset={eq.saveCustomPreset}
      onRemoveCustomPreset={eq.removeCustomPreset}
      onPresetChange={setEqPreset}
      onClose={() => setShowEq(false)}
    />
  ) : null;

  const toastElement = toast ? (
    <motion.div
      key={toast.key}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {' '}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[13px] font-medium shadow-lg whitespace-nowrap max-w-[260px] overflow-hidden">
        {' '}
        {toast.icon === 'star' ? (
          <Star size={13} className="fill-sys-orange text-sys-orange flex-shrink-0" />
        ) : toast.icon === 'heart' ? (
          <Heart size={13} className="fill-pink-400 text-pink-400 flex-shrink-0" />
        ) : (
          <span className="text-[13px] flex-shrink-0">⚠️</span>
        )}{' '}
        <span className="truncate">{toast.msg}</span>
      </div>
    </motion.div>
  ) : null;

  const mkNavTabs = (sz: number) => [
    {
      id: 'discover' as const,
      label: t('discover'),
      icon: <RadioIcon size={sz} aria-hidden="true" />,
    },
    { id: 'history' as const, label: t('history'), icon: <Clock size={sz} aria-hidden="true" /> },
    {
      id: 'favorites' as const,
      label: t('favorites'),
      icon: <Heart size={sz} aria-hidden="true" />,
    },
  ];
  const navTabs14 = useMemo(() => mkNavTabs(14), [t]);
  const navTabs13 = useMemo(() => mkNavTabs(13), [t]);

  const { concerts: shellConcerts } = useConcerts(enrichedTrack?.artist, !!radio.station);

  /* ── Prop bundles ──────────────────────────────────────────────── */
  const theaterBaseProps = {
    track: enrichedTrack,
    isPlaying: radio.status === 'playing',
    frequencyDataRef: analyser.frequencyDataRef,
    artworkUrl: albumArt.artworkUrl,
    icyBitrate,
    onFavSong: enrichedTrack?.title ? handleFavSong : undefined,
    isSongLiked,
    lyrics,
    currentTime: effectiveCurrentTime,
    activeLineOverride: realtimeLyrics?.activeLineIndex,
    concerts: shellConcerts,
  };

  const theaterFullProps = {
    ...theaterBaseProps,
    station: radio.station!,
    onBack: () => setTheaterMode(false),
    onToggleFav: radio.station ? handleToggleFav : undefined,
    isFavorite: radio.station ? favs.has(radio.station.stationuuid) : false,
  };

  const nowPlayingBaseProps = {
    station: radio.station,
    track: enrichedTrack,
    status: radio.status,
    volume: radio.volume,
    muted: radio.muted,
    frequencyDataRef: analyser.frequencyDataRef,
    icyBitrate,
    streamQuality: radio.streamQuality,
    onTogglePlay: radio.togglePlay,
    onSetVolume: radio.setVolume,
    onToggleMute: radio.toggleMute,
    sleepTimerMin: sleepTimer.remainingMin,
    onCycleSleepTimer: sleepTimer.cycle,
  };

  const nowPlayingFullProps = {
    ...nowPlayingBaseProps,
    onToggleEq: () => setShowEq((s) => !s),
    onToggleTheater: () => setTheaterMode(true),
    onToggleFav: radio.station ? handleToggleFav : undefined,
    onFavSong: enrichedTrack?.title ? handleFavSong : undefined,
    isFavorite: radio.station ? favs.has(radio.station.stationuuid) : false,
    songLiked: isSongLiked,
    eqPresetActive: eqPreset !== null,
    showEq,
    theaterMode,
    effectsEnabled,
    onToggleEffects: toggleEffects,
  };

  /* ── View elements ─────────────────────────────────────────────── */
  const browseViewElement = (
    <BrowseView
      view={view}
      currentStation={radio.station}
      isPlaying={radio.status === 'playing'}
      isFavorite={favs.has}
      onPlay={handlePlay}
      onToggleFav={favs.toggle}
      onPrefetch={radio.prefetchStream}
      favorites={favs.favorites}
      recent={recent.recent}
      onSelectGenre={handleSelectGenre}
      onSelectCountry={handleSelectCountry}
      onGoHome={handleGoHome}
      userGenreOrder={usageStats.genreOrder}
    />
  );

  const historyViewElement = (
    <HistoryGridView
      history={songHistory.history}
      onRemove={songHistory.remove}
      onClear={songHistory.clear}
      onToggleFavSong={handleFavSongFromHistory}
      isSongFavorite={favSongs.has}
      onSelect={setSelectedSong}
    />
  );

  const favsViewElement = (
    <FavoriteSongsView
      songs={favSongs.songs}
      onRemove={favSongs.remove}
      onClear={favSongs.clear}
      onSelect={setSelectedSong}
    />
  );

  const primaryGenre = useMemo(() => {
    const t = radio.station?.tags;
    if (!t) return undefined;
    const ci = t.indexOf(',');
    return (ci < 0 ? t : t.slice(0, ci)).trim().toLowerCase() || undefined;
  }, [radio.station?.tags]);

  const parallaxElement = (
    <ParallaxBackground
      faviconUrl={radio.station?.favicon}
      genre={primaryGenre}
      audioAmplitude={bgAudio.amplitude}
      landingMode={isLandingNavigation}
    />
  );

  const nowPlayingHeroElement = radio.station ? (
    <NowPlayingHero
      station={radio.station}
      track={enrichedTrack}
      isPlaying={radio.status === 'playing'}
      frequencyDataRef={analyser.frequencyDataRef}
      artworkUrl={albumArt.artworkUrl}
      icyBitrate={icyBitrate}
      onTheater={() => setTheaterMode(true)}
    />
  ) : null;

  const sharedModals = (
    <>
      {' '}
      {songDetailModal} {shortcutsOverlay} {offlineBanner} <OnboardingModal />
    </>
  );

  const devApiConsoleElement =
    process.env.NODE_ENV === 'development' ? (
      <>
        <DevApiConsole />
        <ApiPlayground />
      </>
    ) : null;

  const pulseLogoButton = (
    <button
      onClick={handleGoHome}
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      aria-label="Go to home"
    >
      {' '}
      <div className="relative w-5 h-5 flex-shrink-0">
        {' '}
        <UiImage
          src="/favicon-32x32.png"
          alt="Pulse"
          className="object-contain"
          sizes="20px"
          priority
        />{' '}
      </div>
      <span className="text-[15px] font-semibold text-white">Pulse</span>
    </button>
  );

  const emptyStation = useMemo(
    (): Station => ({
      name: t('discover'),
      url_resolved: '',
      stationuuid: '',
      favicon: '',
      tags: '',
      codec: '',
      bitrate: 0,
      country: '',
      countrycode: '',
      votes: 0,
    }),
    [t],
  );

  const glassStyle = {
    background: 'rgba(30, 32, 45, 0.62)',
    backdropFilter: 'blur(20px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
  } as const;

  /* ═══════════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════════ */

  // ── PiP layout ──
  if (layout === 'pip') {
    return (
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
      >
        {' '}
        {parallaxElement}{' '}
        <div className="flex-1 min-h-0 relative z-10 flex flex-col">
          {' '}
          <TheaterView
            {...theaterBaseProps}
            station={radio.station ?? emptyStation}
            onBack={_NOOP}
            compact
          />
        </div>{' '}
        <NowPlayingBar
          {...nowPlayingBaseProps}
          onToggleEq={_NOOP}
          showEq={false}
          theaterMode={true}
          compact
        />{' '}
        {sharedModals}
      </div>
    );
  }

  // ── Mobile layout ──
  if (layout === 'mobile') {
    return (
      <div
        ref={containerRef}
        className="relative h-full bg-[#0a0f1a] text-white overflow-hidden select-none"
      >
        {' '}
        <LiquidGlassSvgFilter />
        {parallaxElement}{' '}
        <div className="h-full overflow-y-auto relative z-10">
          {' '}
          {!theaterMode && (
            <header
              data-testid="mobile-header"
              className="sticky top-0 z-30 safe-top border-b border-white/10"
              style={glassStyle}
              role="banner"
            >
              {' '}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                {' '}
                {pulseLogoButton} <div className="flex-1" />{' '}
                <button
                  onClick={() => setShowMobileSettings(true)}
                  className="w-11 h-11 flex-center-row rounded-xl text-white/45 hover:text-white/60 transition-colors active:scale-95 flex-shrink-0"
                  title="Settings"
                  aria-label="Settings"
                  data-testid="mobile-settings-btn"
                >
                  <Settings size={18} />
                </button>{' '}
                {radio.station && (
                  <button
                    onClick={radio.station ? handleToggleFav : undefined}
                    aria-label={
                      radio.station && favs.has(radio.station.stationuuid)
                        ? t('removeFromFavorites')
                        : t('addToFavorites')
                    }
                    className={`w-11 h-11 flex-center-row rounded-xl transition-colors active:scale-95 flex-shrink-0 ${radio.station && favs.has(radio.station.stationuuid) ? 'text-sys-orange' : 'text-white/45'}`}
                  >
                    {' '}
                    <Star
                      size={18}
                      className={
                        radio.station && favs.has(radio.station.stationuuid)
                          ? 'fill-sys-orange'
                          : ''
                      }
                    />{' '}
                  </button>
                )}
              </div>
            </header>
          )}{' '}
          {theaterMode && radio.station ? (
            <div className="h-full flex flex-col">
              {' '}
              <div className="flex-1 min-h-0">
                <TheaterView {...theaterFullProps} lyricsVariant="mobile" />
              </div>{' '}
              <div className="h-20 shrink-0" />
            </div>
          ) : (
            <main id="main-content" className="flex flex-col min-h-full pb-24">
              {' '}
              {nowPlayingHeroElement}{' '}
              <nav
                className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-2"
                aria-label="Main navigation"
                role="tablist"
              >
                {navTabs14.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all active:scale-95 flex-shrink-0 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/45 hover:text-white/60 hover:bg-white/[0.04]'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </nav>
              <div className="flex-shrink-0 px-4 pb-2">
                {' '}
                <form onSubmit={handleSearchSubmit}>
                  {' '}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.05]">
                    {' '}
                    <Search
                      size={13}
                      className="text-white/45 flex-shrink-0"
                      aria-hidden="true"
                    />{' '}
                    <input
                      type="search"
                      placeholder={t('searchStations')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label={t('searchStationsAria')}
                      autoComplete="off"
                      className="bg-transparent text-white text-[13px] placeholder:text-white/50 outline-none focus-visible:ring-2 focus-visible:ring-accent/70 w-full min-w-0"
                      data-radio-search
                    />
                  </div>
                </form>
              </div>
              <div className="flex-1 min-h-0">
                {' '}
                {activeTab === 'discover'
                  ? browseViewElement
                  : activeTab === 'history'
                    ? historyViewElement
                    : favsViewElement}{' '}
              </div>
            </main>
          )}
        </div>{' '}
        {eqPanelElement}{' '}
        <AnimatePresence>
          {showMobileSettings && (
            <MobileSettingsPanel
              onClose={() => setShowMobileSettings(false)}
              eq={eq}
              onPresetChange={setEqPreset}
              effectsEnabled={effectsEnabled}
              onToggleEffects={toggleEffects}
              statsData={{
                topStations: usageStats.topStations,
                topSongs: usageStats.topSongs,
                topArtists: usageStats.topArtists,
                topGenres: usageStats.topGenres,
                totalListenMs: usageStats.stats.totalListenMs,
              }}
            />
          )}
        </AnimatePresence>{' '}
        <AnimatePresence>{toastElement}</AnimatePresence>{' '}
        <div
          data-testid="mobile-bottom-bar"
          className="absolute bottom-0 inset-x-0 z-20 border-t border-white/10 flex flex-col"
          style={glassStyle}
        >
          {' '}
          {shellConcerts.length > 0 && radio.station && (
            <ConcertMobileBanner
              concerts={shellConcerts}
              onClick={() => setShowConcertModal(true)}
            />
          )}
          {showConcertModal && shellConcerts.length > 0 && (
            <ConcertModal
              concerts={shellConcerts}
              artistName={enrichedTrack?.artist}
              onClose={() => setShowConcertModal(false)}
            />
          )}
          <NowPlayingBar {...nowPlayingFullProps} compact />
        </div>
        {devApiConsoleElement}
        {sharedModals}
      </div>
    );
  }

  // ── Desktop layout ──
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent focus:text-white focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>{' '}
      <LiquidGlassSvgFilter />
      {parallaxElement}{' '}
      <div className="flex flex-1 min-h-0 relative z-10">
        {' '}
        <div className="flex flex-col flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {' '}
            {theaterMode && radio.station && !miniMode ? (
              <motion.div
                key="theater"
                initial={_MOTION_FADE_IN}
                animate={_MOTION_FADE_VISIBLE}
                exit={_MOTION_FADE_OUT}
                transition={_MOTION_T_03}
                className="flex-1 min-h-0"
              >
                <TheaterView {...theaterFullProps} lyricsVariant="desktop" />
              </motion.div>
            ) : !miniMode ? (
              <React.Fragment key="browse">
                {' '}
                <div className="shrink-0 px-5 py-3">
                  <div className="flex items-center gap-3">
                    {' '}
                    {pulseLogoButton} <div className="flex-1" /> <LanguageSelector />
                    <button
                      onClick={() => setShowDesktopSettings(true)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl text-white/45 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      title="Settings"
                      aria-label="Settings"
                      data-testid="desktop-settings-btn"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                </div>{' '}
                {nowPlayingHeroElement}{' '}
                <div
                  className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-1"
                  role="tablist"
                  aria-label="Main navigation"
                >
                  {navTabs13.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0 ${activeTab === tab.id ? 'bg-surface-6 text-white' : 'text-dim hover:text-white/60 hover:bg-surface-2'}`}
                    >
                      {tab.icon} {tab.label}{' '}
                      {tab.id === 'history' && songHistory.history.length > 0 && (
                        <span className="text-[12px] text-white/50 ml-0.5">
                          {songHistory.history.length}
                        </span>
                      )}{' '}
                      {tab.id === 'favorites' && favSongs.songs.length > 0 && (
                        <span className="text-[12px] text-white/50 ml-0.5">
                          {favSongs.songs.length}
                        </span>
                      )}
                    </button>
                  ))}{' '}
                  <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 ml-2">
                    {' '}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-white/[0.05]">
                      {' '}
                      <Search
                        size={12}
                        className="text-white/50 flex-shrink-0"
                        aria-hidden="true"
                      />{' '}
                      <input
                        type="search"
                        placeholder={t('searchStations')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label={t('searchStationsAria')}
                        autoComplete="off"
                        className="bg-transparent text-white placeholder:text-white/50 outline-none focus-visible:ring-2 focus-visible:ring-accent/70 w-full min-w-0"
                        data-radio-search
                      />
                    </div>
                  </form>
                </div>{' '}
                <AnimatePresence mode="wait">
                  {' '}
                  {(() => {
                    const [key, content, extra] =
                      activeTab === 'discover'
                        ? [viewKey, browseViewElement, '']
                        : activeTab === 'history'
                          ? ['history-tab', historyViewElement, ' overflow-y-auto']
                          : ['favorites-tab', favsViewElement, ' overflow-y-auto'];
                    return (
                      <motion.div
                        key={key}
                        initial={_MOTION_FADE_IN}
                        animate={_MOTION_FADE_VISIBLE}
                        exit={_MOTION_FADE_OUT}
                        transition={{ duration: 0.15 }}
                        className={`flex-1 min-h-0${extra}`}
                      >
                        {' '}
                        {content}
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </React.Fragment>
            ) : (
              radio.station && (
                <div key="mini" className="flex items-center gap-4 px-6 py-4 flex-1">
                  {' '}
                  {albumArt.artworkUrl ? (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {' '}
                      <UiImage
                        src={albumArt.artworkUrl}
                        alt=""
                        className="object-cover"
                        sizes="56px"
                        loading="lazy"
                      />{' '}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-surface-2 flex-shrink-0" />
                  )}{' '}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-white truncate">
                      {' '}
                      {enrichedTrack?.title || radio.station.name}
                    </p>{' '}
                    <p className="text-[12px] text-white/55 truncate">
                      {enrichedTrack?.artist || t('internetRadio')}
                    </p>{' '}
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>{' '}
      {eqPanelElement}{' '}
      <AnimatePresence>{toastElement}</AnimatePresence>
      {shellConcerts.length > 0 && (
        <ConcertMobileBanner concerts={shellConcerts} onClick={() => setShowConcertModal(true)} />
      )}
      {showConcertModal && shellConcerts.length > 0 && (
        <ConcertModal
          concerts={shellConcerts}
          artistName={enrichedTrack?.artist}
          onClose={() => setShowConcertModal(false)}
        />
      )}
      <div className="relative z-10 border-t border-white/10" style={glassStyle}>
        {' '}
        <div className="pointer-events-none absolute -top-14 inset-x-3 z-10 flex items-center justify-end gap-3">
          <button
            onClick={() => setMiniMode((m) => !m)}
            className="pointer-events-auto shrink-0 p-2 rounded bg-surface-2 hover:bg-surface-5 text-white/55 hover:text-white/70 transition-colors"
            title={miniMode ? t('expand') : t('minimize')}
            aria-label={miniMode ? t('expand') : t('minimize')}
            aria-pressed={miniMode}
          >
            {' '}
            {miniMode ? (
              <Maximize2 size={12} aria-hidden="true" />
            ) : (
              <Minimize2 size={12} aria-hidden="true" />
            )}
          </button>{' '}
        </div>
        <NowPlayingBar {...nowPlayingFullProps} />
      </div>
      <AnimatePresence>
        {showDesktopSettings && (
          <MobileSettingsPanel
            onClose={() => setShowDesktopSettings(false)}
            eq={eq}
            onPresetChange={setEqPreset}
            effectsEnabled={effectsEnabled}
            onToggleEffects={toggleEffects}
            statsData={{
              topStations: usageStats.topStations,
              topSongs: usageStats.topSongs,
              topArtists: usageStats.topArtists,
              topGenres: usageStats.topGenres,
              totalListenMs: usageStats.stats.totalListenMs,
            }}
            desktop
          />
        )}
      </AnimatePresence>
      {devApiConsoleElement}
      {sharedModals}
    </div>
  );
}
