/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useState } from 'react';
import { X, Power, Plus, Save } from 'lucide-react';
import type { EqBand, EqPreset, NoiseReductionMode } from '../types';
import { EQ_PRESETS } from '../constants';

type Props = {
  bands: EqBand[];
  enabled: boolean;
  normalizerEnabled: boolean;
  stereoWidth: number;
  bassEnhance: number;
  compressorEnabled: boolean;
  compressorAmount: number;
  noiseReductionMode: NoiseReductionMode;
  customPresets?: EqPreset[];
  onSetGain: (id: string, gain: number) => void;
  onApplyPreset: (gains: number[]) => void;
  onToggleEnabled: () => void;
  onToggleNormalizer: () => void;
  onSetStereoWidth: (w: number) => void;
  onSetBassEnhance: (v: number) => void;
  onToggleCompressor: () => void;
  onSetCompressorAmount: (v: number) => void;
  onSetNoiseReductionMode: (mode: NoiseReductionMode) => void;
  onClose: () => void;
  onSaveCustomPreset?: (name: string) => void;
  onRemoveCustomPreset?: (name: string) => void;
  onPresetChange?: (name: string | null) => void;
};

export default React.memo(function EqPanel({ bands, enabled, normalizerEnabled, stereoWidth, bassEnhance, compressorEnabled, compressorAmount, noiseReductionMode, customPresets = [], onSetGain, onApplyPreset, onToggleEnabled, onToggleNormalizer, onSetStereoWidth, onSetBassEnhance, onToggleCompressor, onSetCompressorAmount, onSetNoiseReductionMode, onClose, onSaveCustomPreset, onRemoveCustomPreset, onPresetChange }: Props) {
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const handleSelectPreset = (name: string, gains: number[]) => {
    setSelectedPreset(name); onApplyPreset(gains);
    onPresetChange?.(name);
  };
  const handleSetGain = (id: string, gain: number) => {
    setSelectedPreset(null); onPresetChange?.(null);
    onSetGain(id, gain);
  };
  const handleSave = () => {
    const name = presetName.trim();
    if (name && onSaveCustomPreset) {
      onSaveCustomPreset(name); setPresetName(''); setShowSaveInput(false);
    }
  };
  return (<div className="absolute bottom-16 right-4 w-72 bg-sys-surface/95 backdrop-blur-xl border border-border-strong rounded-xl p-4 shadow-2xl z-50">
      {/* Header */}
      <div className="flex-between mb-4">
        <div className="flex-row-2"><span className="text-[13px] font-semibold text-white">Equalizer</span>
 <button onClick={onToggleEnabled} aria-label={enabled ? 'Disable equalizer' : 'Enable equalizer'} className={`p-1 rounded transition-colors ${enabled ? 'text-sys-orange' : 'text-dim'}`} ><Power size={13} /></button>
 <button onClick={onToggleNormalizer} aria-label={normalizerEnabled ? 'Disable loudness normalizer' : 'Enable loudness normalizer'} title="Loudness Normalizer" className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors ${normalizerEnabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-surface-2 text-dim hover:text-secondary'}`}>NORM</button></div>
        <button onClick={onClose} aria-label="Close equalizer" className="p-1 text-subtle-hover"><X size={14} /></button></div>
      {/* Presets */}
      <div className="flex-wrap-1.5 mb-2">
        {EQ_PRESETS.map(preset => (
 <button key={preset.name} onClick={() => handleSelectPreset(preset.name, preset.gains)}
            className={`px-2 py-1 text-[10px] rounded-md transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-surface-2 hover:bg-surface-4 text-secondary hover:text-white'}`}>
            {preset.name}</button>
        ))}
        {customPresets.map(preset => (
          <div key={`custom-${preset.name}`} className="flex-row-0.5">
            <button onClick={() => handleSelectPreset(preset.name, preset.gains)}
              className={`px-2 py-1 text-[10px] rounded-l-md transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border-l border-t border-b border-sys-orange/40' : 'bg-sys-orange/10 hover:bg-sys-orange/20 text-sys-orange hover:text-white'}`}>
              {preset.name}</button>
            {onRemoveCustomPreset && (
              <button onClick={() => onRemoveCustomPreset(preset.name)}
                aria-label={`Delete ${preset.name} preset`}
                className="px-1 py-1 text-[10px] rounded-r-md bg-sys-orange/10 hover:bg-red-500/30 text-dim hover:text-red-400 transition-colors">
                <X size={8} /></button>)}</div>))}</div>
      {/* Save custom preset */}
      {onSaveCustomPreset && (
        <div className="mb-4">
          {showSaveInput ? (
            <div className="flex-row-1.5">
 <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
                placeholder="Preset name…"
                aria-label="Preset name"
                className="flex-1 px-2 py-1 text-[10px] rounded-md bg-surface-2 border border-border-strong text-white placeholder:text-white/30 outline-none focus:border-sys-orange/50"
                autoFocus/>
 <button onClick={handleSave} aria-label="Save preset" className="p-1 rounded-md bg-sys-orange/20 text-sys-orange hover:bg-sys-orange/30 transition-colors" ><Save size={10} /></button>
              <button onClick={() => setShowSaveInput(false)}
                aria-label="Cancel"
                className="p-1 rounded-md bg-surface-2 text-subtle-hover"><X size={10} /></button></div>
          ) : (
            <button onClick={() => setShowSaveInput(true)}
              className="flex-row-1 px-2 py-1 text-[10px] rounded-md bg-surface-1 hover:bg-surface-3 text-muted hover:text-white/60 transition-colors">
              <Plus size={10} />
              Save Custom</button>)}</div>
      )}
      {/* Band sliders */}
      <div className="flex items-end justify-between gap-2">
        {bands.map(band => (
          <div key={band.id} className="col-center gap-1">
            <span className="text-[9px] text-dim tabular-nums">{band.gain > 0 ? `+${band.gain}` : band.gain}</span>
 <input type="range" min={-12} max={12} step={1} value={band.gain} onChange={e => handleSetGain(band.id, parseInt(e.target.value, 10))}
              disabled={!enabled}
              aria-label={`${band.label} gain`}
              className="eq-slider h-24 appearance-none bg-transparent cursor-pointer disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sys-orange/60 focus-visible:outline-offset-2 rounded [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-runnable-track]:w-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-surface-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
            />
            <span className="text-[9px] text-secondary">{band.label}</span></div>))}</div>
      {/* Stereo width */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="mb-2"><div className="text-[10px] text-secondary mb-1">Noise Reduction</div>
          <div className="flex-wrap-1.5">
            {(['off', 'low', 'medium', 'high'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onSetNoiseReductionMode(mode)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                  noiseReductionMode === mode
                    ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40'
                    : 'bg-surface-2 hover:bg-surface-4 text-secondary hover:text-white'
                }`}
                aria-label={`Noise reduction ${mode}`}>{mode.toUpperCase()}</button>))}</div></div>
        <div className="flex items-center gap-2"><span className="text-[10px] text-secondary shrink-0 w-12">Width</span>
          <input type="range" min={0} max={200} step={5} value={Math.round(stereoWidth * 100)}
            onChange={e => onSetStereoWidth(parseInt(e.target.value, 10) / 100)}
            aria-label="Stereo width"
            className="flex-1 h-1 appearance-none bg-surface-4 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
          />
          <span className="text-[9px] text-dim tabular-nums w-8 text-right">{Math.round(stereoWidth * 100)}%</span>
        </div><div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-secondary shrink-0 w-12">Bass+</span>
          <input type="range" min={0} max={100} step={5} value={Math.round(bassEnhance * 100)}
            onChange={e => onSetBassEnhance(parseInt(e.target.value, 10) / 100)}
            aria-label="Bass enhance"
            className="flex-1 h-1 appearance-none bg-surface-4 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
          />
          <span className="text-[9px] text-dim tabular-nums w-8 text-right">{Math.round(bassEnhance * 100)}%</span>
        </div><div className="flex items-center gap-2 mt-2">
          <button onClick={onToggleCompressor} aria-label={compressorEnabled ? 'Disable compressor' : 'Enable compressor'} title="Multiband Compressor" className={`text-[10px] font-semibold shrink-0 w-12 text-left transition-colors ${compressorEnabled ? 'text-sys-orange' : 'text-secondary'}`}>Comp</button>
          <input type="range" min={0} max={100} step={5} value={Math.round(compressorAmount * 100)}
            onChange={e => onSetCompressorAmount(parseInt(e.target.value, 10) / 100)}
            disabled={!compressorEnabled}
            aria-label="Compressor amount"
            className="flex-1 h-1 appearance-none bg-surface-4 rounded-full cursor-pointer disabled:opacity-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
          />
          <span className="text-[9px] text-dim tabular-nums w-8 text-right">{Math.round(compressorAmount * 100)}%</span>
        </div>
      </div></div>);
});
