/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { EqBand, EqPreset, NoiseReductionMode } from '../types';
import { EQ_BANDS, STORAGE_KEYS } from '../constants';
import { getOrCreateAudioSource } from '@/lib/audio-visualizer';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

const NR_PRESETS: Record<NoiseReductionMode, { hpfHz: number; gateThreshold: number; gateRatio: number; deEsserCenterHz: number; deEsserGain: number }> = {
  off: { hpfHz: 20, gateThreshold: -90, gateRatio: 1.0, deEsserCenterHz: 6000, deEsserGain: 0 },
  low: { hpfHz: 35, gateThreshold: -55, gateRatio: 1.5, deEsserCenterHz: 5500, deEsserGain: -1.5 },
  medium: { hpfHz: 35, gateThreshold: -48, gateRatio: 2.0, deEsserCenterHz: 6000, deEsserGain: -3 },
  high: { hpfHz: 35, gateThreshold: -42, gateRatio: 3.0, deEsserCenterHz: 6500, deEsserGain: -4.5 },
};

const QUALITY_DEFAULTS_MIGRATION_KEY = 'radio-quality-defaults-v2-applied';

function ensureQualityMigration(): void {
  if (loadFromStorage<boolean>(QUALITY_DEFAULTS_MIGRATION_KEY, false)) return;
  saveToStorage(STORAGE_KEYS.NOISE_REDUCTION_MODE, 'low'); saveToStorage(STORAGE_KEYS.NORMALIZER_ENABLED, true);
  saveToStorage(QUALITY_DEFAULTS_MIGRATION_KEY, true);
}

function getDefaultNoiseReductionMode(): NoiseReductionMode {
  ensureQualityMigration(); return loadFromStorage<NoiseReductionMode>(STORAGE_KEYS.NOISE_REDUCTION_MODE, 'low');
}

function getDefaultNormalizerEnabled(): boolean {
  ensureQualityMigration(); return loadFromStorage<boolean>(STORAGE_KEYS.NORMALIZER_ENABLED, true);
}

export function useEqualizer() {
  const [bands, setBands] = useState<EqBand[]>(() => {
    const defaults = EQ_BANDS.map(b => ({ ...b }));
    const saved = loadFromStorage<EqBand[]>(STORAGE_KEYS.EQ_BANDS, defaults);
    // If stored band count doesn't match current config, reset to defaults
    return saved.length === defaults.length ? saved : defaults;
  }); const [enabled, setEnabled] = useState(true);
  const [customPresets, setCustomPresets] = useState<EqPreset[]>(() =>
    loadFromStorage<EqPreset[]>(STORAGE_KEYS.CUSTOM_EQ_PRESETS, [])
  ); const [normalizerEnabled, setNormalizerEnabled] = useState(getDefaultNormalizerEnabled);
  const [stereoWidth, setStereoWidthState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.STEREO_WIDTH, 1.0)
  );
  const [bassEnhance, setBassEnhanceState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.BASS_ENHANCE, 0)
  );
  const [compressorEnabled, setCompressorEnabled] = useState(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.COMPRESSOR_ENABLED, false)
  );
  const [compressorAmount, setCompressorAmountState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.COMPRESSOR_AMOUNT, 0.5)
  );
  const [noiseReductionMode, setNoiseReductionModeState] = useState<NoiseReductionMode>(getDefaultNoiseReductionMode);
  const ctxRef = useRef<AudioContext | null>(null); const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]); const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const normalizerRef = useRef<DynamicsCompressorNode | null>(null); const normGainRef = useRef<GainNode | null>(null);
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null); const outputGainRef = useRef<GainNode | null>(null);
  const outputVolumeRef = useRef(1); const outputMutedRef = useRef(false);
  const directGainLRef = useRef<GainNode | null>(null); const directGainRRef = useRef<GainNode | null>(null);
  const crossGainLRef = useRef<GainNode | null>(null); const crossGainRRef = useRef<GainNode | null>(null);
  const bassLpRef = useRef<BiquadFilterNode | null>(null); const bassShaperRef = useRef<WaveShaperNode | null>(null);
  const bassHpRef = useRef<BiquadFilterNode | null>(null); const bassMixRef = useRef<GainNode | null>(null);
  const nrHighpassRef = useRef<BiquadFilterNode | null>(null);
  const nrGateRef = useRef<DynamicsCompressorNode | null>(null);
  const nrDeEsserRef = useRef<BiquadFilterNode | null>(null); const nrDeEssGainRef = useRef<GainNode | null>(null);
  // Multiband compressor refs: 3 bands (low/mid/high) with crossover filters
  const mbLowLpRef = useRef<BiquadFilterNode | null>(null);
  const mbLowCompRef = useRef<DynamicsCompressorNode | null>(null);
  const mbMidBpLpRef = useRef<BiquadFilterNode | null>(null);
  const mbMidBpHpRef = useRef<BiquadFilterNode | null>(null);
  const mbMidCompRef = useRef<DynamicsCompressorNode | null>(null);
  const mbHighHpRef = useRef<BiquadFilterNode | null>(null);
  const mbHighCompRef = useRef<DynamicsCompressorNode | null>(null); const mbDryGainRef = useRef<GainNode | null>(null);
  const mbWetGainRef = useRef<GainNode | null>(null); const mbMergeRef = useRef<GainNode | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);
  // All audio graph node refs (for bulk disconnect/cleanup)
  const graphNodeRefs: React.MutableRefObject<AudioNode | null>[] = [
    normalizerRef, normGainRef, limiterRef, splitterRef, mergerRef, outputGainRef,
    directGainLRef, directGainRRef, crossGainLRef, crossGainRRef,
    mbLowLpRef, mbLowCompRef, mbMidBpLpRef, mbMidBpHpRef, mbMidCompRef,
    mbHighHpRef, mbHighCompRef, mbDryGainRef, mbWetGainRef, mbMergeRef,
    nrHighpassRef, nrGateRef, nrDeEsserRef, nrDeEssGainRef, bassLpRef, bassShaperRef, bassHpRef, bassMixRef,
  ];
  function teardownGraph(includeSource: boolean) {
    try {
      sourceRef.current?.disconnect(); filtersRef.current.forEach(f => f.disconnect());
      for (const ref of graphNodeRefs) ref.current?.disconnect();
    } catch { /* ok */ }
    filtersRef.current = []; for (const ref of graphNodeRefs) ref.current = null;
    if (includeSource) { sourceRef.current = null; connectedAudioRef.current = null; }
  }
  // Smooth ramp time for parameter changes to prevent clicks/pops
  const RAMP_TIME = 0.02; // 20ms — fast enough to feel instant, slow enough to avoid clicks
  const applyNoiseReductionPreset = useCallback((mode: NoiseReductionMode) => {
    const preset = NR_PRESETS[mode]; const ctx = ctxRef.current; const t = ctx?.currentTime ?? 0;
    if (nrHighpassRef.current) nrHighpassRef.current.frequency.setTargetAtTime(preset.hpfHz, t, RAMP_TIME);
    if (nrGateRef.current) {
      nrGateRef.current.threshold.setTargetAtTime(preset.gateThreshold, t, RAMP_TIME);
      nrGateRef.current.ratio.setTargetAtTime(preset.gateRatio, t, RAMP_TIME);
    }
    if (nrDeEsserRef.current) {
      nrDeEsserRef.current.frequency.setTargetAtTime(preset.deEsserCenterHz, t, RAMP_TIME);
      nrDeEsserRef.current.gain.setTargetAtTime(preset.deEsserGain, t, RAMP_TIME);
    }
  }, []);
  const setOutputVolume = useCallback((volume: number, muted: boolean) => {
    const clamped = Math.max(0, Math.min(1, volume)); outputVolumeRef.current = clamped; outputMutedRef.current = muted;
    const next = muted ? 0 : clamped; const ctx = ctxRef.current;
    if (outputGainRef.current && ctx) {
      outputGainRef.current.gain.setTargetAtTime(next, ctx.currentTime, RAMP_TIME);
    } else if (outputGainRef.current) outputGainRef.current.gain.value = next;
  }, []);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EQ_BANDS, bands); const ctx = ctxRef.current;
    filtersRef.current.forEach((f, i) => {
      if (bands[i]) {
        const target = enabled ? bands[i].gain : 0; if (ctx) f.gain.setTargetAtTime(target, ctx.currentTime, RAMP_TIME);
        else f.gain.value = target;
      }
    });
  }, [bands, enabled]);
  const connectSource = useCallback((audio: HTMLAudioElement) => {
    if (connectedAudioRef.current === audio && ctxRef.current) return;
    // Disconnect any existing chain before building a new one
    if (connectedAudioRef.current) teardownGraph(false);
    try {
      const { ctx, source } = getOrCreateAudioSource(audio); ctxRef.current = ctx; sourceRef.current = source;
      connectedAudioRef.current = audio;
      const nrPreset = NR_PRESETS[noiseReductionMode]; const nyquist = ctx.sampleRate / 2;
      const filters = bands.map(band => {
        const filter = ctx.createBiquadFilter(); filter.type = band.type;
        filter.frequency.value = Math.max(20, Math.min(nyquist - 1, band.frequency));
        filter.gain.value = enabled ? band.gain : 0; if (band.type === 'peaking') filter.Q.value = 1.0;
        return filter;
      });
      // Chain: source → normalizer → makeup gain → filter[0] → ... → limiter → destination
      // Normalizer: gentle compressor that levels loudness across stations
      const normalizer = ctx.createDynamicsCompressor();
      normalizer.threshold.value = -24;  // engage earlier than limiter — catch loud passages
      normalizer.knee.value = 12;        // wide soft knee for transparent compression
      normalizer.ratio.value = 3;        // gentle 3:1 — level without squashing dynamics
      normalizer.attack.value = 0.01;    // 10ms attack — fast enough to catch transients
      normalizer.release.value = 0.25;   // 250ms release — smooth volume recovery
      normalizerRef.current = normalizer;
      // Makeup gain compensates for normalizer's volume reduction (~4dB)
      const normGain = ctx.createGain();
      normGain.gain.value = normalizerEnabled ? 1.6 : 1.0; // ~4dB makeup when active
      normGainRef.current = normGain;
      // Noise-reduction block: high-pass + soft gate + de-esser attenuation branch.
      const nrHighpass = ctx.createBiquadFilter(); nrHighpass.type = 'highpass';
      nrHighpass.frequency.value = nrPreset.hpfHz; nrHighpass.Q.value = 0.7;
      const nrGate = ctx.createDynamicsCompressor(); nrGate.threshold.value = nrPreset.gateThreshold;
      nrGate.knee.value = 4; nrGate.ratio.value = nrPreset.gateRatio;
      nrGate.attack.value = 0.01; nrGate.release.value = 0.18;
      const nrDeEsser = ctx.createBiquadFilter(); nrDeEsser.type = 'peaking';
      nrDeEsser.frequency.value = nrPreset.deEsserCenterHz; nrDeEsser.Q.value = 3.2;
      nrDeEsser.gain.value = nrPreset.deEsserGain; const nrDeEssGain = ctx.createGain(); nrDeEssGain.gain.value = 1;
      nrHighpassRef.current = nrHighpass; nrGateRef.current = nrGate;
      nrDeEsserRef.current = nrDeEsser; nrDeEssGainRef.current = nrDeEssGain;
      if (normalizerEnabled) {
        source.connect(normalizer); normalizer.connect(normGain); normGain.connect(nrHighpass);
      } else source.connect(nrHighpass); nrHighpass.connect(nrGate); nrGate.connect(nrDeEsser);
      nrDeEsser.connect(nrDeEssGain); nrDeEssGain.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) { filters[i].connect(filters[i + 1]); }
      // Psychoacoustic bass enhancer: parallel path that extracts bass,
      // generates harmonics via waveshaping, then mixes back in.
      // This makes bass perceptible on speakers that can't reproduce sub-bass.
      const bassLp = ctx.createBiquadFilter(); bassLp.type = 'lowpass';
      bassLp.frequency.value = 200; bassLp.Q.value = 0.7; const bassShaper = ctx.createWaveShaper();
      // Soft-clip curve that generates even and odd harmonics
      const curveLen = 4096; const curve = new Float32Array(curveLen);
      for (let i = 0; i < curveLen; i++) {
        const x = (i * 2) / curveLen - 1; curve[i] = (Math.PI + 2) * x / (Math.PI + 2 * Math.abs(x));
      }
      bassShaper.curve = curve; bassShaper.oversample = '2x';
      const bassHp = ctx.createBiquadFilter(); bassHp.type = 'highpass';
      bassHp.frequency.value = 80; bassHp.Q.value = 0.7;
      const bassMix = ctx.createGain(); bassMix.gain.value = bassEnhance;
      // Tap from last EQ filter into bass enhance path
      filters[filters.length - 1].connect(bassLp); bassLp.connect(bassShaper);
      bassShaper.connect(bassHp); bassHp.connect(bassMix);
      bassLpRef.current = bassLp; bassShaperRef.current = bassShaper;
      bassHpRef.current = bassHp; bassMixRef.current = bassMix;
      // Multiband dynamics compressor: splits audio into 3 bands (low/mid/high),
      // compresses each independently, then mixes back. This preserves dynamics
      // in non-problematic bands while taming others — much more transparent than
      // single-band compression. Uses dry/wet mix controlled by compressorAmount.
      const mbMerge = ctx.createGain(); mbMerge.gain.value = 1.0;
      const wetAmount = compressorEnabled ? compressorAmount : 0;
      const dryAmount = compressorEnabled ? 1 - compressorAmount * 0.5 : 1; // keep some dry to avoid over-squash
      const mbDry = ctx.createGain(); mbDry.gain.value = dryAmount;
      const mbWet = ctx.createGain(); mbWet.gain.value = wetAmount;
      // Low band: <200Hz — preserve punch, gentle compression
      const mbLowLp = ctx.createBiquadFilter(); mbLowLp.type = 'lowpass';
      mbLowLp.frequency.value = 200; mbLowLp.Q.value = 0.7;
      const mbLowComp = ctx.createDynamicsCompressor(); mbLowComp.threshold.value = -18;
      mbLowComp.knee.value = 10; mbLowComp.ratio.value = 3;
      mbLowComp.attack.value = 0.02;  // slower attack preserves bass transients
      mbLowComp.release.value = 0.3;
      // Mid band: 200Hz-3kHz — voice/instrument body, moderate compression
      const mbMidBpHp = ctx.createBiquadFilter(); mbMidBpHp.type = 'highpass';
      mbMidBpHp.frequency.value = 200; mbMidBpHp.Q.value = 0.7;
      const mbMidBpLp = ctx.createBiquadFilter(); mbMidBpLp.type = 'lowpass';
      mbMidBpLp.frequency.value = 3000; mbMidBpLp.Q.value = 0.7;
      const mbMidComp = ctx.createDynamicsCompressor(); mbMidComp.threshold.value = -20; mbMidComp.knee.value = 8;
      mbMidComp.ratio.value = 4;     // tighter control on mids
      mbMidComp.attack.value = 0.005; mbMidComp.release.value = 0.15;
      // High band: >3kHz — presence/air, fast attack to tame sibilance
      const mbHighHp = ctx.createBiquadFilter(); mbHighHp.type = 'highpass';
      mbHighHp.frequency.value = 3000; mbHighHp.Q.value = 0.7;
      const mbHighComp = ctx.createDynamicsCompressor(); mbHighComp.threshold.value = -16;
      mbHighComp.knee.value = 6; mbHighComp.ratio.value = 3;
      mbHighComp.attack.value = 0.002; // fast — catch sibilants
      mbHighComp.release.value = 0.1;
      // Wire: lastFilter → [dry path, low band, mid band, high band] → wet mix → merge
      const lastFilter = filters[filters.length - 1]; lastFilter.connect(mbDry); mbDry.connect(mbMerge);
      lastFilter.connect(mbLowLp); mbLowLp.connect(mbLowComp); mbLowComp.connect(mbWet);
      lastFilter.connect(mbMidBpHp); mbMidBpHp.connect(mbMidBpLp);
      mbMidBpLp.connect(mbMidComp); mbMidComp.connect(mbWet);
      lastFilter.connect(mbHighHp); mbHighHp.connect(mbHighComp); mbHighComp.connect(mbWet);
      mbWet.connect(mbMerge); bassMix.connect(mbMerge); mbLowLpRef.current = mbLowLp; mbLowCompRef.current = mbLowComp;
      mbMidBpLpRef.current = mbMidBpLp; mbMidBpHpRef.current = mbMidBpHp;
      mbMidCompRef.current = mbMidComp; mbHighHpRef.current = mbHighHp;
      mbHighCompRef.current = mbHighComp; mbDryGainRef.current = mbDry;
      mbWetGainRef.current = mbWet; mbMergeRef.current = mbMerge;
      // Safety limiter to prevent digital clipping from cumulative EQ gains
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;   // engage at -3dBFS
      limiter.knee.value = 6;         // soft knee
      limiter.ratio.value = 20;       // near-brick-wall limiting
      limiter.attack.value = 0.001;   // fast attack
      limiter.release.value = 0.1;    // moderate release
      mbMerge.connect(limiter); limiterRef.current = limiter;
      // Stereo widener: mid-side processing via channel split/merge
      // Width 1.0 = original, 0.0 = mono, 2.0 = max width
      // L_out = L * direct + R * cross, R_out = R * direct + L * cross
      // where direct = (1+w)/2, cross = (1-w)/2
      const w = stereoWidth; const direct = (1 + w) / 2;
      const cross = (1 - w) / 2; const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2); const outputGain = ctx.createGain();
      const directL = ctx.createGain(); const directR = ctx.createGain();
      const crossL = ctx.createGain(); const crossR = ctx.createGain(); directL.gain.value = direct;
      directR.gain.value = direct; crossL.gain.value = cross; crossR.gain.value = cross;
      limiter.connect(splitter);
      // L channel: direct L + cross R
      splitter.connect(directL, 0); splitter.connect(crossR, 1);
      directL.connect(merger, 0, 0); crossR.connect(merger, 0, 0);
      // R channel: direct R + cross L
      splitter.connect(directR, 1); splitter.connect(crossL, 0);
      directR.connect(merger, 0, 1); crossL.connect(merger, 0, 1);
      merger.connect(outputGain); outputGain.connect(ctx.destination);
      outputGainRef.current = outputGain; const initialOutput = outputMutedRef.current ? 0 : outputVolumeRef.current;
      outputGain.gain.value = initialOutput; splitterRef.current = splitter; mergerRef.current = merger;
      directGainLRef.current = directL; directGainRRef.current = directR;
      crossGainLRef.current = crossL; crossGainRRef.current = crossR; filtersRef.current = filters;
    } catch {
      // Keep playback alive when WebAudio graph creation fails (observed on
      // some iOS background/resume paths for cross-origin streams).
      sourceRef.current = null; filtersRef.current = []; connectedAudioRef.current = audio;
    }
  }, [bands, bassEnhance, compressorAmount, compressorEnabled, enabled, noiseReductionMode, normalizerEnabled, stereoWidth]);
  const disconnect = useCallback(() => { teardownGraph(true); }, []); const MAX_GAIN_DB = 12;
  const setBandGain = useCallback((id: string, gain: number) => {
    const clamped = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, gain));
    setBands(prev => prev.map(b => b.id === id ? { ...b, gain: clamped } : b));
  }, []);
  const applyPreset = useCallback((gains: number[]) => {
    setBands(prev => prev.map((b, i) => ({
      ...b, gain: Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, gains[i] ?? 0)),
    })));
  }, []); const toggleEnabled = useCallback(() => setEnabled(e => !e), []);
  const toggleNormalizer = useCallback(() => {
    setNormalizerEnabled(prev => {
      const next = !prev; saveToStorage(STORAGE_KEYS.NORMALIZER_ENABLED, next);
      // Live-toggle: rewire audio graph without full reconnect
      const source = sourceRef.current; const normalizer = normalizerRef.current;
      const normGain = normGainRef.current; const nrHead = nrHighpassRef.current;
      if (source && normalizer && normGain && nrHead) {
        try {
          try { source.disconnect(normalizer); } catch { /* source may not be connected to normalizer */ }
          try { source.disconnect(nrHead); } catch { /* source may not be connected to NR head */ }
          normalizer.disconnect(); normGain.disconnect(); const ctx = ctxRef.current; const t = ctx?.currentTime ?? 0;
          if (next) {
            normGain.gain.setTargetAtTime(1.6, t, RAMP_TIME); source.connect(normalizer);
            normalizer.connect(normGain); normGain.connect(nrHead);
          } else { normGain.gain.setTargetAtTime(1.0, t, RAMP_TIME); source.connect(nrHead); }
        } catch { /* ok */ }
      }
      return next;
    });
  }, []);
  const saveCustomPreset = useCallback((name: string) => {
    const preset: EqPreset = { name, gains: bands.map(b => b.gain) };
    setCustomPresets(prev => {
      const next = [...prev.filter(p => p.name !== name), preset]; saveToStorage(STORAGE_KEYS.CUSTOM_EQ_PRESETS, next);
      return next;
    });
  }, [bands]);
  const removeCustomPreset = useCallback((name: string) => {
    setCustomPresets(prev => {
      const next = prev.filter(p => p.name !== name); saveToStorage(STORAGE_KEYS.CUSTOM_EQ_PRESETS, next); return next;
    });
  }, []);
  const setStereoWidth = useCallback((w: number) => {
    const clamped = Math.max(0, Math.min(2, w)); setStereoWidthState(clamped);
    saveToStorage(STORAGE_KEYS.STEREO_WIDTH, clamped);
    const direct = (1 + clamped) / 2; const cross = (1 - clamped) / 2;
    const ctx = ctxRef.current; const t = ctx?.currentTime ?? 0;
    if (directGainLRef.current) directGainLRef.current.gain.setTargetAtTime(direct, t, RAMP_TIME);
    if (directGainRRef.current) directGainRRef.current.gain.setTargetAtTime(direct, t, RAMP_TIME);
    if (crossGainLRef.current) crossGainLRef.current.gain.setTargetAtTime(cross, t, RAMP_TIME);
    if (crossGainRRef.current) crossGainRRef.current.gain.setTargetAtTime(cross, t, RAMP_TIME);
  }, []);
  const setBassEnhance = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v)); setBassEnhanceState(clamped);
    saveToStorage(STORAGE_KEYS.BASS_ENHANCE, clamped); const ctx = ctxRef.current;
    if (bassMixRef.current && ctx) {
      bassMixRef.current.gain.setTargetAtTime(clamped, ctx.currentTime, RAMP_TIME);
    } else if (bassMixRef.current) bassMixRef.current.gain.value = clamped;
  }, []);
  const toggleCompressor = useCallback(() => {
    setCompressorEnabled(prev => {
      const next = !prev; saveToStorage(STORAGE_KEYS.COMPRESSOR_ENABLED, next);
      const ctx = ctxRef.current; const t = ctx?.currentTime ?? 0; const amount = compressorAmount;
      if (mbDryGainRef.current && mbWetGainRef.current) {
        if (next) {
          mbDryGainRef.current.gain.setTargetAtTime(1 - amount * 0.5, t, RAMP_TIME);
          mbWetGainRef.current.gain.setTargetAtTime(amount, t, RAMP_TIME);
        } else {
          mbDryGainRef.current.gain.setTargetAtTime(1, t, RAMP_TIME);
          mbWetGainRef.current.gain.setTargetAtTime(0, t, RAMP_TIME);
        }
      }
      return next;
    });
  }, [compressorAmount]);
  const setCompressorAmount = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v)); setCompressorAmountState(clamped);
    saveToStorage(STORAGE_KEYS.COMPRESSOR_AMOUNT, clamped); if (!compressorEnabled) return;
    const ctx = ctxRef.current; const t = ctx?.currentTime ?? 0;
    if (mbDryGainRef.current) mbDryGainRef.current.gain.setTargetAtTime(1 - clamped * 0.5, t, RAMP_TIME);
    if (mbWetGainRef.current) mbWetGainRef.current.gain.setTargetAtTime(clamped, t, RAMP_TIME);
  }, [compressorEnabled]);
  const setNoiseReductionMode = useCallback((mode: NoiseReductionMode) => {
    setNoiseReductionModeState(mode); saveToStorage(STORAGE_KEYS.NOISE_REDUCTION_MODE, mode);
    applyNoiseReductionPreset(mode);
  }, [applyNoiseReductionPreset]);
  useEffect(() => { applyNoiseReductionPreset(noiseReductionMode); }, [applyNoiseReductionPreset, noiseReductionMode]);
  return {
    bands, enabled,
    normalizerEnabled, stereoWidth,
    bassEnhance, compressorEnabled,
    compressorAmount, noiseReductionMode,
    customPresets, setBandGain,
    applyPreset, toggleEnabled,
    toggleNormalizer, setStereoWidth,
    setBassEnhance, toggleCompressor,
    setCompressorAmount, setNoiseReductionMode,
    setOutputVolume, connectSource,
    disconnect, saveCustomPreset,
    removeCustomPreset,
  };
}
