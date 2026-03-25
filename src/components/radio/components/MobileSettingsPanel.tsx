/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
"use client";
import React, { useState, useCallback } from "react";
import { X, Languages, Sliders, Power, ChevronDown, ChevronUp, Plus, Save } from "lucide-react";
import { IoHelpCircleOutline, IoStatsChartOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "motion/react";
import { useLocale } from "@/context/LocaleContext";
import { EQ_PRESETS } from "../constants";
import type { EqBand, EqPreset, NoiseReductionMode } from "../types";
import UsageGuide from "./UsageGuide";
import StatsView from "./StatsView";
import type { StationListenTime, SongPlayCount, ArtistPlayCount, GenrePlayCount } from "../hooks/useStats";
type Props = { onClose: () => void;
  eq: { bands: EqBand[]; enabled: boolean; normalizerEnabled: boolean; stereoWidth: number;
    bassEnhance: number; compressorEnabled: boolean; compressorAmount: number; noiseReductionMode: NoiseReductionMode;
    customPresets: EqPreset[]; setBandGain: (id: string, gain: number) => void;
    applyPreset: (gains: number[]) => void; toggleEnabled: () => void;
    toggleNormalizer: () => void; setStereoWidth: (w: number) => void; setBassEnhance: (v: number) => void;
    toggleCompressor: () => void; setCompressorAmount: (v: number) => void;
    setNoiseReductionMode: (mode: NoiseReductionMode) => void; saveCustomPreset: (name: string) => void;
    removeCustomPreset: (name: string) => void;
  }; onPresetChange: (name: string | null) => void;
  statsData?: { topStations: StationListenTime[]; topSongs: SongPlayCount[];
    topArtists: ArtistPlayCount[]; topGenres: GenrePlayCount[]; totalListenMs: number; };
};
export default function MobileSettingsPanel({ onClose, eq, onPresetChange, statsData }: Props) {
  const { locale, setLocale, locales } = useLocale(); const [showEq, setShowEq] = useState(false);
  const [showGuide, setShowGuide] = useState(false); const [showStats, setShowStats] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false); const [presetName, setPresetName] = useState("");
  const handleSelectPreset = useCallback((name: string, gains: number[]) => {
    setSelectedPreset(name); eq.applyPreset(gains); onPresetChange(name);
  }, [eq, onPresetChange]);
  const handleSetGain = useCallback((id: string, gain: number) => {
    setSelectedPreset(null); onPresetChange(null); eq.setBandGain(id, gain);
  }, [eq, onPresetChange]); const handleSave = () => { const name = presetName.trim();
    if (name) { eq.saveCustomPreset(name); setPresetName(""); setShowSaveInput(false); } };
  return ( <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col"> {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} /> {/* Panel slides up from bottom */} <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
        style={{ background: "rgba(22, 24, 35, 0.92)", backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)", }}
        data-testid="mobile-settings-panel"> {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
        {/* Header */} <div className="flex items-center justify-between px-5 pb-3">
          <h2 className="text-[17px] font-semibold text-white">Settings</h2><button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 flex-center-row rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          ><X size={16} /></button></div><div className="border-t border-white/8" />
        {/* Language section */} <div className="px-5 py-4"><div className="flex items-center gap-2 mb-3">
            <Languages size={16} className="text-white/60" />
            <span className="text-[14px] font-medium text-white/80">Language</span></div>
          <div className="grid grid-cols-3 gap-2">{locales.map((item) => ( <button
                key={item.code}
                onClick={() => setLocale(item.code as typeof locale)}
                className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${ locale === item.code
                    ? "bg-sys-orange/20 border border-sys-orange/50 text-sys-orange"
                    : "bg-white/5 border border-white/8 text-white/60 hover:text-white/80"
                }`}>{item.nativeName}</button>))}</div></div><div className="border-t border-white/8" />
        {/* Equalizer section — fully inline */} <div className="px-5 py-4">
          <button onClick={() => setShowEq((s) => !s)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2"><Sliders size={16} className="text-white/60" />
              <span className="text-[14px] font-medium text-white/80">Equalizer</span></div>
            <div className="flex items-center gap-2">
              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                eq.enabled ? "bg-sys-orange/20 text-sys-orange" : "bg-white/5 text-white/40"
              }`}>{eq.enabled ? "ON" : "OFF"}</span>
              {showEq ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
            </div></button>
          {showEq && ( <div className="mt-4 space-y-4">
              {/* Power + Normalizer toggles */} <div className="flex items-center gap-2">
                <button onClick={eq.toggleEnabled} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${eq.enabled ? "bg-sys-orange/20 text-sys-orange border border-sys-orange/40" : "bg-white/5 text-white/40 border border-white/8"}`}>
                  <Power size={12} /> {eq.enabled ? "Enabled" : "Disabled"}</button>
                <button onClick={eq.toggleNormalizer} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${eq.normalizerEnabled ? "bg-sys-orange/20 text-sys-orange border border-sys-orange/40" : "bg-white/5 text-white/40 border border-white/8"}`}>
                  NORM</button></div>
              {/* Presets */}
              <div><span className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Presets</span>
                <div className="flex flex-wrap gap-1.5">{EQ_PRESETS.map(preset => (
                    <button key={preset.name} onClick={() => handleSelectPreset(preset.name, preset.gains)}
                      className={`px-2.5 py-1.5 text-[11px] rounded-lg transition-colors ${selectedPreset === preset.name ? "bg-sys-orange/20 text-sys-orange border border-sys-orange/40" : "bg-white/5 border border-white/8 text-white/50 hover:text-white/80"}`}>
                      {preset.name}</button>
                  ))}
                  {eq.customPresets.map(preset => ( <div key={`custom-${preset.name}`} className="flex">
                      <button onClick={() => handleSelectPreset(preset.name, preset.gains)}
                        className={`px-2.5 py-1.5 text-[11px] rounded-l-lg transition-colors ${selectedPreset === preset.name ? "bg-sys-orange/20 text-sys-orange border-l border-t border-b border-sys-orange/40" : "bg-sys-orange/10 text-sys-orange border-l border-t border-b border-white/8"}`}>
                        {preset.name}</button><button onClick={() => eq.removeCustomPreset(preset.name)}
                        aria-label={`Delete ${preset.name} preset`}
                        className="px-1.5 py-1.5 text-[11px] rounded-r-lg bg-white/5 border border-white/8 text-white/30 hover:text-red-400 transition-colors">
                        <X size={10} /></button></div>))}</div>
                {/* Save custom */} <div className="mt-2">{showSaveInput ? ( <div className="flex items-center gap-1.5">
                      <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowSaveInput(false); }}
                        placeholder="Preset name…"
                        className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-white/5 border border-white/8 text-white placeholder:text-white/25 outline-none focus:border-sys-orange/50"
                        autoFocus />
                      <button onClick={handleSave} aria-label="Save preset" className="p-1.5 rounded-lg bg-sys-orange/20 text-sys-orange"><Save size={12} /></button>
                      <button onClick={() => setShowSaveInput(false)} aria-label="Cancel" className="p-1.5 rounded-lg bg-white/5 text-white/40"><X size={12} /></button>
                    </div>
                  ) : ( <button onClick={() => setShowSaveInput(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white/60 transition-colors">
                      <Plus size={10} /> Save Custom</button>)}</div></div>
              {/* Band sliders — horizontal scroll */}
              <div><span className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Bands</span>
                <div className="flex items-end justify-between gap-1.5 px-1">
                  {eq.bands.map(band => ( <div key={band.id} className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-white/40 tabular-nums">{band.gain > 0 ? `+${band.gain}` : band.gain}</span>
                      <input type="range" min={-12} max={12} step={1} value={band.gain}
                        onChange={e => handleSetGain(band.id, parseInt(e.target.value, 10))}
                        disabled={!eq.enabled}
                        aria-label={`${band.label} Hz gain`}
                        className="eq-slider h-20 appearance-none bg-transparent cursor-pointer disabled:opacity-30 [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-runnable-track]:w-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                      />
                      <span className="text-[8px] text-white/40">{band.label}</span></div>))}</div></div>
              {/* Noise Reduction */} <div>
                <span className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Noise Reduction</span>
                <div className="flex gap-1.5">{(["off", "low", "medium", "high"] as const).map(mode => (
                    <button key={mode} onClick={() => eq.setNoiseReductionMode(mode)}
                      className={`flex-1 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                        eq.noiseReductionMode === mode
                          ? "bg-sys-orange/20 text-sys-orange border border-sys-orange/40"
                          : "bg-white/5 border border-white/8 text-white/50"
                      }`}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</button>))}</div></div>
              {/* Sliders: Width, Bass, Compressor */}
              <div className="space-y-3"><div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-10 shrink-0">Width</span>
                  <input type="range" min={0} max={200} step={5} value={Math.round(eq.stereoWidth * 100)}
                    onChange={e => eq.setStereoWidth(parseInt(e.target.value, 10) / 100)}
                    aria-label="Stereo width"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange" />
                  <span className="text-[10px] text-white/30 tabular-nums w-8 text-right">{Math.round(eq.stereoWidth * 100)}%</span>
                </div><div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 w-10 shrink-0">Bass+</span>
                  <input type="range" min={0} max={100} step={5} value={Math.round(eq.bassEnhance * 100)}
                    onChange={e => eq.setBassEnhance(parseInt(e.target.value, 10) / 100)}
                    aria-label="Bass enhance"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange" />
                  <span className="text-[10px] text-white/30 tabular-nums w-8 text-right">{Math.round(eq.bassEnhance * 100)}%</span>
                </div><div className="flex items-center gap-3">
                  <button onClick={eq.toggleCompressor} className={`text-[11px] w-10 shrink-0 text-left font-medium transition-colors ${eq.compressorEnabled ? "text-sys-orange" : "text-white/50"}`}>Comp</button>
                  <input type="range" min={0} max={100} step={5} value={Math.round(eq.compressorAmount * 100)}
                    onChange={e => eq.setCompressorAmount(parseInt(e.target.value, 10) / 100)}
                    disabled={!eq.compressorEnabled}
                    aria-label="Compressor amount"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer disabled:opacity-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange" />
                  <span className="text-[10px] text-white/30 tabular-nums w-8 text-right">{Math.round(eq.compressorAmount * 100)}%</span>
                </div></div></div>)}</div>
        {/* Usage guide & Stats */} <div className="border-t border-white/8" />
        <div className="px-5 py-4 space-y-2"><button
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors text-left"
          ><IoHelpCircleOutline size={18} className="text-[#3478f6] flex-shrink-0" />
            <span className="text-[14px] font-medium text-white/70">How to use Pulse</span></button><button
            onClick={() => setShowStats(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors text-left"
          ><IoStatsChartOutline size={18} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[14px] font-medium text-white/70">Your Statistics</span></button></div>
        {/* Bottom safe area padding */} <div className="h-6" /></motion.div>
      {/* Usage Guide overlay */}
      <AnimatePresence>{showGuide && <UsageGuide onClose={() => setShowGuide(false)} />}</AnimatePresence>
      {/* Stats overlay */} <AnimatePresence>{showStats && ( <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex flex-col">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowStats(false)} /> <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
              style={{ background: 'rgba(20, 22, 35, 0.75)', backdropFilter: 'blur(32px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.12)', }}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
              <div className="flex items-center gap-3 px-5 pb-3"><button
                  onClick={() => setShowStats(false)}
                  aria-label="Close statistics"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
                ><X size={16} /></button><h2 className="text-[17px] font-semibold text-white">Your Statistics</h2></div>
              <div className="border-t border-white/8" /> {statsData && ( <StatsView
                  topStations={statsData.topStations}
                  topSongs={statsData.topSongs}
                  topArtists={statsData.topArtists}
                  topGenres={statsData.topGenres}
                  totalListenMs={statsData.totalListenMs} />
              )} <div className="h-6" /></motion.div></motion.div>)}</AnimatePresence></motion.div>
  ); }
