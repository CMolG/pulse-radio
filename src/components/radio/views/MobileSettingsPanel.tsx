'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Languages,
  Sliders,
  ChevronUp,
  ChevronDown,
  Power,
  Plus,
  Save,
  HelpCircle,
  BarChart3,
  Radio as RadioIcon,
  Search,
  Heart,
  Music,
  Palette,
  Timer,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import type {
  EqBand,
  EqPreset,
  NoiseReductionMode,
  StationListenTime,
  SongPlayCount,
  ArtistPlayCount,
  GenrePlayCount,
} from '../constants';
import { EQ_PRESETS } from '../constants';
import { useLocale } from '@/context/LocaleContext';
import StatsView from './StatsView';

const _MOTION_FADE_IN = { opacity: 0 } as const;
const _MOTION_FADE_VISIBLE = { opacity: 1 } as const;
const _MOTION_FADE_OUT = { opacity: 0 } as const;
const _MOTION_SLIDE_UP_INIT = { y: '100%' } as const;
const _MOTION_SLIDE_UP_VISIBLE = { y: 0 } as const;
const _MOTION_SLIDE_UP_EXIT = { y: '100%' } as const;
const _MOTION_T_02 = { duration: 0.2 } as const;
const _MOTION_T_SPRING = { type: 'spring' as const, damping: 28, stiffness: 300 };
const _GLASS_SETTINGS_STYLE: React.CSSProperties = {
  background: 'rgba(22, 24, 35, 0.92)',
  backdropFilter: 'blur(24px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
};
const _GLASS_PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.12)',
};
const GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
};
type GuideSection = { icon: React.ReactNode; title: string; content: string };
const GUIDE_SECTIONS: GuideSection[] = [
  {
    icon: <RadioIcon size={22} className="text-[#3478f6]" aria-hidden="true" />,
    title: 'Listening to Radio',
    content:
      'Browse stations by genre, country or search. Tap any station card to start playing. The visualizer activates automatically with live audio-reactive effects.',
  },
  {
    icon: <Search size={22} className="text-cyan-400" aria-hidden="true" />,
    title: 'Search & Discover',
    content:
      'Use the search bar to find stations by name, genre or location. Enable Discovery Mode (lightning icon) to auto-play random stations every 30 seconds.',
  },
  {
    icon: <Heart size={22} className="text-pink-400" aria-hidden="true" />,
    title: 'Favorites',
    content:
      'Tap the star to save stations. Tap the heart to save songs. Filter your favorite songs by artist — songs are grouped in stacks you can expand.',
  },
  {
    icon: <Music size={22} className="text-purple-400" aria-hidden="true" />,
    title: 'Lyrics & Track Info',
    content:
      'Pulse detects the current song and fetches lyrics automatically. Tap on any song in history for detailed info including artist bio and album art.',
  },
  {
    icon: <Palette size={22} className="text-amber-400" aria-hidden="true" />,
    title: 'Theater Mode',
    content:
      'Press T or tap the theater button to enter immersive mode. The Fibonacci spiral visualizer reacts to the music with a CRT retro effect overlay.',
  },
  {
    icon: <BarChart3 size={22} className="text-emerald-400" aria-hidden="true" />,
    title: 'Your Statistics',
    content:
      'Pulse tracks your listening: time per station, most played songs, top artists and genres. Your home screen reorders sections based on what you listen to most.',
  },
  {
    icon: <Timer size={22} className="text-orange-400" aria-hidden="true" />,
    title: 'Sleep Timer',
    content:
      'Press Z or use the timer icon to cycle through sleep durations (15, 30, 60, 90 min). Pulse will automatically stop playback when the timer ends.',
  },
  {
    icon: <Globe size={22} className="text-sky-400" aria-hidden="true" />,
    title: 'Keyboard Shortcuts',
    content:
      'Space: play/pause • ← →: skip station • ↑ ↓: volume • T: theater • E: equalizer • L: like song • S: star station • F: focus search • ?: show all shortcuts.',
  },
];
type UsageGuideProps = { onClose: () => void };
function UsageGuideBase({ onClose }: UsageGuideProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  return (
    <motion.div
      initial={_MOTION_FADE_IN}
      animate={_MOTION_FADE_VISIBLE}
      exit={_MOTION_FADE_OUT}
      transition={_MOTION_T_02}
      className="absolute inset-0 z-50 flex flex-col"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />{' '}
      <motion.div
        initial={_MOTION_SLIDE_UP_INIT}
        animate={_MOTION_SLIDE_UP_VISIBLE}
        exit={_MOTION_SLIDE_UP_EXIT}
        transition={_MOTION_T_SPRING}
        className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
        style={GLASS_STYLE}
        role="dialog"
        aria-modal="true"
        aria-label="How to use Pulse"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {' '}
        {/* Handle bar */}{' '}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>{' '}
        {/* Header */}{' '}
        <div className="flex items-center gap-3 px-5 pb-3">
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>{' '}
          <h2 className="text-[17px] font-semibold text-white">How to use Pulse</h2>
        </div>{' '}
        <div className="border-t border-white/8" /> {/* Guide sections */}{' '}
        <div className="px-5 py-4 space-y-2">
          {' '}
          {GUIDE_SECTIONS.map((section, idx) => {
            const isExpanded = expandedIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.03]"
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="flex-shrink-0">{section.icon}</div>{' '}
                  <span className="text-[14px] font-medium text-white/80 flex-1">
                    {section.title}
                  </span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={_MOTION_T_02}
                    className="text-white/45 text-[12px]"
                  >
                    ▶
                  </motion.span>
                </button>
                <AnimatePresence>
                  {' '}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={_MOTION_T_02}
                      className="overflow-hidden"
                    >
                      {' '}
                      <p className="px-4 pb-3 text-[13px] text-white/50 leading-relaxed pl-[52px]">
                        {section.content}
                      </p>{' '}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}
const UsageGuide = React.memo(UsageGuideBase);
type MobileSettingsPanelProps = {
  onClose: () => void;
  eq: {
    bands: EqBand[];
    enabled: boolean;
    normalizerEnabled: boolean;
    stereoWidth: number;
    bassEnhance: number;
    compressorEnabled: boolean;
    compressorAmount: number;
    noiseReductionMode: NoiseReductionMode;
    customPresets: EqPreset[];
    setBandGain: (id: string, gain: number) => void;
    applyPreset: (gains: number[]) => void;
    toggleEnabled: () => void;
    toggleNormalizer: () => void;
    setStereoWidth: (w: number) => void;
    setBassEnhance: (v: number) => void;
    toggleCompressor: () => void;
    setCompressorAmount: (v: number) => void;
    setNoiseReductionMode: (mode: NoiseReductionMode) => void;
    saveCustomPreset: (name: string) => void;
    removeCustomPreset: (name: string) => void;
  };
  onPresetChange: (name: string | null) => void;
  statsData?: {
    topStations: StationListenTime[];
    topSongs: SongPlayCount[];
    topArtists: ArtistPlayCount[];
    topGenres: GenrePlayCount[];
    totalListenMs: number;
  };
  desktop?: boolean;
  effectsEnabled: boolean;
  onToggleEffects: () => void;
};
function MobileSettingsPanel({
  onClose,
  eq,
  onPresetChange,
  statsData,
  desktop,
  effectsEnabled,
  onToggleEffects,
}: MobileSettingsPanelProps) {
  const { locale, setLocale, locales } = useLocale();
  const [showEq, setShowEq] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const handleSelectPreset = useCallback(
    (name: string, gains: number[]) => {
      setSelectedPreset(name);
      eq.applyPreset(gains);
      onPresetChange(name);
    },
    [eq, onPresetChange],
  );
  const handleSetGain = useCallback(
    (id: string, gain: number) => {
      setSelectedPreset(null);
      onPresetChange(null);
      eq.setBandGain(id, gain);
    },
    [eq, onPresetChange],
  );
  const handleSave = () => {
    const name = presetName.trim();
    if (name) {
      eq.saveCustomPreset(name);
      setPresetName('');
      setShowSaveInput(false);
    }
  };
  return (
    <motion.div
      initial={_MOTION_FADE_IN}
      animate={_MOTION_FADE_VISIBLE}
      exit={_MOTION_FADE_OUT}
      transition={_MOTION_T_02}
      className={
        desktop
          ? 'fixed inset-0 z-50 flex items-center justify-center'
          : 'absolute inset-0 z-50 flex flex-col'
      }
    >
      {' '}
      {/* Backdrop */}{' '}
      <div
        className={desktop ? 'fixed inset-0 bg-black/60' : 'absolute inset-0 bg-black/50'}
        onClick={onClose}
        aria-hidden="true"
      />{' '}
      {/* Panel */}{' '}
      <motion.div
        initial={desktop ? { opacity: 0, scale: 0.95 } : _MOTION_SLIDE_UP_INIT}
        animate={desktop ? { opacity: 1, scale: 1 } : _MOTION_SLIDE_UP_VISIBLE}
        exit={desktop ? { opacity: 0, scale: 0.95 } : _MOTION_SLIDE_UP_EXIT}
        transition={desktop ? { duration: 0.2 } : _MOTION_T_SPRING}
        className={
          desktop
            ? 'relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl'
            : 'absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom'
        }
        style={_GLASS_SETTINGS_STYLE}
        data-testid={desktop ? 'desktop-settings-modal' : 'mobile-settings-panel'}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {' '}
        {/* Handle bar — mobile only */}{' '}
        {!desktop && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}{' '}
        {/* Header */}{' '}
        <div className={`flex items-center justify-between px-5 pb-3 ${desktop ? 'pt-4' : ''}`}>
          {' '}
          <h2 className="text-[17px] font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-10 h-10 flex-center-row rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="border-t border-white/8" /> {/* Language section */}{' '}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            {' '}
            <Languages size={16} className="text-white/60" />{' '}
            <span className="text-[14px] font-medium text-white/80">Language</span>
          </div>{' '}
          <div className="grid grid-cols-3 gap-2">
            {locales.map((item) => (
              <button
                key={item.code}
                onClick={() => setLocale(item.code as typeof locale)}
                className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${locale === item.code ? 'bg-sys-orange/20 border border-sys-orange/50 text-sys-orange' : 'bg-white/5 border border-white/8 text-white/60 hover:text-white/80'}`}
              >
                {item.nativeName}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-white/8" /> {/* Equalizer section — fully inline */}{' '}
        <div className="px-5 py-4">
          {' '}
          <button
            onClick={() => {
              setShowEq((s) => !s);
              if (!effectsEnabled) {
                onToggleEffects();
              }
            }}
            className="flex items-center justify-between w-full"
            aria-label="Toggle equalizer section"
            aria-expanded={showEq}
          >
            {' '}
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-white/60" />{' '}
              <span className="text-[14px] font-medium text-white/80">Equalizer</span>
            </div>{' '}
            <div className="flex items-center gap-2">
              {' '}
              <span
                className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${eq.enabled ? 'bg-sys-orange/20 text-sys-orange' : 'bg-white/5 text-white/45'}`}
              >
                {eq.enabled ? 'ON' : 'OFF'}
              </span>{' '}
              {showEq ? (
                <ChevronUp size={14} className="text-white/45" />
              ) : (
                <ChevronDown size={14} className="text-white/45" />
              )}{' '}
            </div>
          </button>{' '}
          {showEq && (
            <div className="mt-4 space-y-4">
              {' '}
              {/* Power + Normalizer toggles */}{' '}
              <div className="flex items-center gap-2">
                {' '}
                <button
                  onClick={eq.toggleEnabled}
                  aria-label={eq.enabled ? 'Disable equalizer' : 'Enable equalizer'}
                  aria-pressed={eq.enabled}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${eq.enabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 text-white/45 border border-white/8'}`}
                >
                  {' '}
                  <Power size={12} /> {eq.enabled ? 'Enabled' : 'Disabled'}
                </button>{' '}
                <button
                  onClick={eq.toggleNormalizer}
                  aria-label={
                    eq.normalizerEnabled
                      ? 'Disable loudness normalizer'
                      : 'Enable loudness normalizer'
                  }
                  aria-pressed={eq.normalizerEnabled}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${eq.normalizerEnabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 text-white/45 border border-white/8'}`}
                >
                  {' '}
                  NORM
                </button>
              </div>{' '}
              {/* Presets */}{' '}
              <div>
                <span className="text-[12px] text-white/50 uppercase tracking-wider mb-2 block">
                  Presets
                </span>{' '}
                <div className="flex flex-wrap gap-1.5">
                  {EQ_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset.name, preset.gains)}
                      className={`px-2.5 py-1.5 text-[12px] rounded-lg transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 border border-white/8 text-white/50 hover:text-white/80'}`}
                    >
                      {' '}
                      {preset.name}
                    </button>
                  ))}{' '}
                  {eq.customPresets.map((preset) => (
                    <div key={`custom-${preset.name}`} className="flex">
                      {' '}
                      <button
                        onClick={() => handleSelectPreset(preset.name, preset.gains)}
                        className={`px-2.5 py-1.5 text-[12px] rounded-l-lg transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border-l border-t border-b border-sys-orange/40' : 'bg-sys-orange/10 text-sys-orange border-l border-t border-b border-white/8'}`}
                      >
                        {' '}
                        {preset.name}
                      </button>
                      <button
                        onClick={() => eq.removeCustomPreset(preset.name)}
                        aria-label={`Delete ${preset.name} preset`}
                        className="px-1.5 py-1.5 text-[12px] rounded-r-lg bg-white/5 border border-white/8 text-white/45 hover:text-red-400 transition-colors"
                      >
                        {' '}
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>{' '}
                {/* Save custom */}{' '}
                <div className="mt-2">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      {' '}
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave();
                          if (e.key === 'Escape') setShowSaveInput(false);
                        }}
                        placeholder="Preset name…"
                        aria-label="Preset name"
                        className="flex-1 px-2.5 py-1.5 text-[12px] rounded-lg bg-white/5 border border-white/8 text-white placeholder:text-white/50 outline-none focus:border-sys-orange/50"
                        autoFocus
                      />{' '}
                      <button
                        onClick={handleSave}
                        aria-label="Save preset"
                        className="p-2 rounded-lg bg-sys-orange/20 text-sys-orange"
                      >
                        <Save size={12} />
                      </button>{' '}
                      <button
                        onClick={() => setShowSaveInput(false)}
                        aria-label="Cancel"
                        className="p-2 rounded-lg bg-white/5 text-white/45"
                      >
                        <X size={12} />
                      </button>{' '}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] rounded-lg bg-white/5 border border-white/8 text-white/45 hover:text-white/60 transition-colors"
                    >
                      {' '}
                      <Plus size={10} /> Save Custom
                    </button>
                  )}
                </div>
              </div>{' '}
              {/* Band sliders — horizontal scroll */}{' '}
              <div>
                <span className="text-[12px] text-white/50 uppercase tracking-wider mb-2 block">
                  Bands
                </span>{' '}
                <div className="flex items-end justify-between gap-1.5 px-1">
                  {' '}
                  {eq.bands.map((band) => (
                    <div key={band.id} className="flex flex-col items-center gap-1">
                      {' '}
                      <span className="text-[12px] text-white/50 tabular-nums">
                        {band.gain > 0 ? `+${band.gain}` : band.gain}
                      </span>{' '}
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={band.gain}
                        onChange={(e) => handleSetGain(band.id, parseInt(e.target.value, 10))}
                        disabled={!eq.enabled}
                        aria-label={`${band.label} Hz gain`}
                        className="eq-slider h-20 appearance-none bg-transparent cursor-pointer disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sys-orange/60 focus-visible:outline-offset-2 rounded [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-runnable-track]:w-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                      />{' '}
                      <span className="text-[12px] text-white/50">{band.label}</span>
                    </div>
                  ))}
                </div>
              </div>{' '}
              {/* Noise Reduction */}{' '}
              <div>
                {' '}
                <span className="text-[12px] text-white/50 uppercase tracking-wider mb-2 block">
                  Noise Reduction
                </span>{' '}
                <div className="flex gap-1.5">
                  {(['off', 'low', 'medium', 'high'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => eq.setNoiseReductionMode(mode)}
                      className={`flex-1 py-1.5 text-[12px] rounded-lg font-medium transition-colors ${eq.noiseReductionMode === mode ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 border border-white/8 text-white/50'}`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>{' '}
              {/* Sliders: Width, Bass, Compressor */}{' '}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {' '}
                  <span className="text-[12px] text-white/50 w-10 shrink-0">Width</span>{' '}
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={Math.round(eq.stereoWidth * 100)}
                    onChange={(e) => eq.setStereoWidth(parseInt(e.target.value, 10) / 100)}
                    aria-label="Stereo width"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-sys-orange/60 focus-visible:outline-offset-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                  />{' '}
                  <span className="text-[12px] text-white/50 tabular-nums w-8 text-right">
                    {Math.round(eq.stereoWidth * 100)}%
                  </span>{' '}
                </div>
                <div className="flex items-center gap-3">
                  {' '}
                  <span className="text-[12px] text-white/50 w-10 shrink-0">Bass+</span>{' '}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(eq.bassEnhance * 100)}
                    onChange={(e) => eq.setBassEnhance(parseInt(e.target.value, 10) / 100)}
                    aria-label="Bass enhance"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-sys-orange/60 focus-visible:outline-offset-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                  />{' '}
                  <span className="text-[12px] text-white/50 tabular-nums w-8 text-right">
                    {Math.round(eq.bassEnhance * 100)}%
                  </span>{' '}
                </div>
                <div className="flex items-center gap-3">
                  {' '}
                  <button
                    onClick={eq.toggleCompressor}
                    aria-label={eq.compressorEnabled ? 'Disable compressor' : 'Enable compressor'}
                    aria-pressed={eq.compressorEnabled}
                    className={`text-[12px] w-10 shrink-0 text-left font-medium transition-colors ${eq.compressorEnabled ? 'text-sys-orange' : 'text-white/50'}`}
                  >
                    Comp
                  </button>{' '}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(eq.compressorAmount * 100)}
                    onChange={(e) => eq.setCompressorAmount(parseInt(e.target.value, 10) / 100)}
                    disabled={!eq.compressorEnabled}
                    aria-label="Compressor amount"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sys-orange/60 focus-visible:outline-offset-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                  />{' '}
                  <span className="text-[12px] text-white/50 tabular-nums w-8 text-right">
                    {Math.round(eq.compressorAmount * 100)}%
                  </span>{' '}
                </div>
              </div>
            </div>
          )}
        </div>{' '}
        {/* Usage guide & Stats */} <div className="border-t border-white/8" />{' '}
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors text-left"
          >
            <HelpCircle size={18} className="text-[#3478f6] flex-shrink-0" />{' '}
            <span className="text-[14px] font-medium text-white/70">How to use Pulse</span>
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors text-left"
          >
            <BarChart3 size={18} className="text-emerald-400 flex-shrink-0" />{' '}
            <span className="text-[14px] font-medium text-white/70">Your Statistics</span>
          </button>
        </div>{' '}
        {/* Bottom safe area padding */} <div className="h-6" />
      </motion.div>{' '}
      {/* Usage Guide overlay */}{' '}
      <AnimatePresence>
        {showGuide && <UsageGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>{' '}
      {/* Stats overlay */}{' '}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={_MOTION_FADE_IN}
            animate={_MOTION_FADE_VISIBLE}
            exit={_MOTION_FADE_OUT}
            transition={_MOTION_T_02}
            className={
              desktop
                ? 'fixed inset-0 z-50 flex items-center justify-center'
                : 'absolute inset-0 z-50 flex flex-col'
            }
          >
            {' '}
            <div
              className={desktop ? 'fixed inset-0 bg-black/60' : 'absolute inset-0 bg-black/50'}
              onClick={() => setShowStats(false)}
              aria-hidden="true"
            />{' '}
            <motion.div
              initial={desktop ? { opacity: 0, scale: 0.95 } : _MOTION_SLIDE_UP_INIT}
              animate={desktop ? { opacity: 1, scale: 1 } : _MOTION_SLIDE_UP_VISIBLE}
              exit={desktop ? { opacity: 0, scale: 0.95 } : _MOTION_SLIDE_UP_EXIT}
              transition={desktop ? { duration: 0.2 } : _MOTION_T_SPRING}
              className={
                desktop
                  ? 'relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl'
                  : 'absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom'
              }
              style={desktop ? _GLASS_SETTINGS_STYLE : _GLASS_PANEL_STYLE}
              role="dialog"
              aria-modal="true"
              aria-label="Your Statistics"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') setShowStats(false);
              }}
            >
              {' '}
              {!desktop && (
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
              )}{' '}
              <div className={`flex items-center gap-3 px-5 pb-3 ${desktop ? 'pt-4' : ''}`}>
                <button
                  onClick={() => setShowStats(false)}
                  aria-label="Close statistics"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <h2 className="text-[17px] font-semibold text-white">Your Statistics</h2>
              </div>{' '}
              <div className="border-t border-white/8" />{' '}
              {statsData && (
                <StatsView
                  topStations={statsData.topStations}
                  topSongs={statsData.topSongs}
                  topArtists={statsData.topArtists}
                  topGenres={statsData.topGenres}
                  totalListenMs={statsData.totalListenMs}
                />
              )}{' '}
              <div className="h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
export default MobileSettingsPanel;
