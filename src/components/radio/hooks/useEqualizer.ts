/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { EqBand, EqPreset } from '../types';
import { EQ_BANDS, STORAGE_KEYS } from '../constants';
import { getOrCreateAudioSource } from '@/lib/audio-visualizer';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

export type UseEqualizerReturn = {
  bands: EqBand[];
  enabled: boolean;
  customPresets: EqPreset[];
  setBandGain: (id: string, gain: number) => void;
  applyPreset: (gains: number[]) => void;
  toggleEnabled: () => void;
  connectSource: (audio: HTMLAudioElement) => void;
  disconnect: () => void;
  saveCustomPreset: (name: string) => void;
  removeCustomPreset: (name: string) => void;
};

export function useEqualizer(): UseEqualizerReturn {
  const [bands, setBands] = useState<EqBand[]>(() => {
    const defaults = EQ_BANDS.map(b => ({ ...b }));
    const saved = loadFromStorage<EqBand[]>(STORAGE_KEYS.EQ_BANDS, defaults);
    // If stored band count doesn't match current config, reset to defaults
    return saved.length === defaults.length ? saved : defaults;
  });
  const [enabled, setEnabled] = useState(true);
  const [customPresets, setCustomPresets] = useState<EqPreset[]>(() =>
    loadFromStorage<EqPreset[]>(STORAGE_KEYS.CUSTOM_EQ_PRESETS, [])
  );

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EQ_BANDS, bands);
    filtersRef.current.forEach((f, i) => {
      if (bands[i]) f.gain.value = enabled ? bands[i].gain : 0;
    });
  }, [bands, enabled]);

  const connectSource = useCallback((audio: HTMLAudioElement) => {
    if (connectedAudioRef.current === audio && ctxRef.current) return;

    // Disconnect any existing chain before building a new one
    if (connectedAudioRef.current) {
      try {
        sourceRef.current?.disconnect();
        filtersRef.current.forEach(f => f.disconnect());
        limiterRef.current?.disconnect();
      } catch { /* ok */ }
      filtersRef.current = [];
      limiterRef.current = null;
    }

    try {
      const { ctx, source } = getOrCreateAudioSource(audio);
      ctxRef.current = ctx;
      sourceRef.current = source;
      connectedAudioRef.current = audio;

      const filters = bands.map(band => {
        const filter = ctx.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.frequency;
        filter.gain.value = enabled ? band.gain : 0;
        if (band.type === 'peaking') filter.Q.value = 1.0;
        return filter;
      });

      // Chain: source → filter[0] → ... → limiter → destination
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }

      // Safety limiter to prevent digital clipping from cumulative EQ gains
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;   // engage at -3dBFS
      limiter.knee.value = 6;         // soft knee
      limiter.ratio.value = 20;       // near-brick-wall limiting
      limiter.attack.value = 0.001;   // fast attack
      limiter.release.value = 0.1;    // moderate release
      filters[filters.length - 1].connect(limiter);
      limiter.connect(ctx.destination);
      limiterRef.current = limiter;

      filtersRef.current = filters;
    } catch { /* Web Audio not available */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = useCallback(() => {
    try {
      sourceRef.current?.disconnect();
      filtersRef.current.forEach(f => f.disconnect());
      limiterRef.current?.disconnect();
    } catch { /* ok */ }
    sourceRef.current = null;
    filtersRef.current = [];
    limiterRef.current = null;
    connectedAudioRef.current = null;
  }, []);

  const MAX_GAIN_DB = 12;

  const setBandGain = useCallback((id: string, gain: number) => {
    const clamped = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, gain));
    setBands(prev => prev.map(b => b.id === id ? { ...b, gain: clamped } : b));
  }, []);

  const applyPreset = useCallback((gains: number[]) => {
    setBands(prev => prev.map((b, i) => ({
      ...b,
      gain: Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, gains[i] ?? 0)),
    })));
  }, []);

  const toggleEnabled = useCallback(() => setEnabled(e => !e), []);

  const saveCustomPreset = useCallback((name: string) => {
    const preset: EqPreset = { name, gains: bands.map(b => b.gain) };
    setCustomPresets(prev => {
      const next = [...prev.filter(p => p.name !== name), preset];
      saveToStorage(STORAGE_KEYS.CUSTOM_EQ_PRESETS, next);
      return next;
    });
  }, [bands]);

  const removeCustomPreset = useCallback((name: string) => {
    setCustomPresets(prev => {
      const next = prev.filter(p => p.name !== name);
      saveToStorage(STORAGE_KEYS.CUSTOM_EQ_PRESETS, next);
      return next;
    });
  }, []);

  return { bands, enabled, customPresets, setBandGain, applyPreset, toggleEnabled, connectSource, disconnect, saveCustomPreset, removeCustomPreset };
}
