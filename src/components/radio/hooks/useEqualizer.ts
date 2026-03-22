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
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EQ_BANDS);
      if (saved) return JSON.parse(saved);
    } catch { /* use defaults */ }
    return EQ_BANDS.map(b => ({ ...b }));
  });
  const [enabled, setEnabled] = useState(true);
  const [customPresets, setCustomPresets] = useState<EqPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_EQ_PRESETS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EQ_BANDS, JSON.stringify(bands));
    filtersRef.current.forEach((f, i) => {
      if (bands[i]) f.gain.value = enabled ? bands[i].gain : 0;
    });
  }, [bands, enabled]);

  const connectSource = useCallback((audio: HTMLAudioElement) => {
    if (connectedAudioRef.current === audio && ctxRef.current) return;

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

      // Chain: source → filter[0] → filter[1] → ... → destination
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(ctx.destination);

      filtersRef.current = filters;
    } catch { /* Web Audio not available */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = useCallback(() => {
    try {
      sourceRef.current?.disconnect();
      filtersRef.current.forEach(f => f.disconnect());
    } catch { /* ok */ }
    sourceRef.current = null;
    filtersRef.current = [];
    connectedAudioRef.current = null;
  }, []);

  const setBandGain = useCallback((id: string, gain: number) => {
    setBands(prev => prev.map(b => b.id === id ? { ...b, gain } : b));
  }, []);

  const applyPreset = useCallback((gains: number[]) => {
    setBands(prev => prev.map((b, i) => ({ ...b, gain: gains[i] ?? 0 })));
  }, []);

  const toggleEnabled = useCallback(() => setEnabled(e => !e), []);

  const saveCustomPreset = useCallback((name: string) => {
    const preset: EqPreset = { name, gains: bands.map(b => b.gain) };
    setCustomPresets(prev => {
      const next = [...prev.filter(p => p.name !== name), preset];
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EQ_PRESETS, JSON.stringify(next));
      return next;
    });
  }, [bands]);

  const removeCustomPreset = useCallback((name: string) => {
    setCustomPresets(prev => {
      const next = prev.filter(p => p.name !== name);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EQ_PRESETS, JSON.stringify(next));
      return next;
    });
  }, []);

  return { bands, enabled, customPresets, setBandGain, applyPreset, toggleEnabled, connectSource, disconnect, saveCustomPreset, removeCustomPreset };
}
