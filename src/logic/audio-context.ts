/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { _NOOP } from '@/logic/format-utils';

export class LRU<T> {
  private m = new Map<string, T>();
  constructor(private max: number) {}
  get(k: string) {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: T) {
    this.m.delete(k);
    this.m.set(k, v);
    while (this.m.size > this.max) {
      const oldest = this.m.keys().next().value;
      if (oldest !== undefined) this.m.delete(oldest);
      else break;
    }
  }
}

export const audioSourceCache = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; source: MediaElementAudioSourceNode }
>();

let sharedCtx: AudioContext | null = null;

export function getSharedContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(_NOOP);
  return sharedCtx;
}

export function getOrCreateAudioSource(audio: HTMLAudioElement): {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
} {
  const existing = audioSourceCache.get(audio);
  if (existing) {
    if (existing.ctx.state === 'suspended') existing.ctx.resume().catch(_NOOP);
    return existing;
  }
  const ctx = getSharedContext();
  const source = ctx.createMediaElementSource(audio);
  const entry = { ctx, source };
  audioSourceCache.set(audio, entry);
  return entry;
}

export function resumeAudioContext(audio: HTMLAudioElement): void {
  const entry = audioSourceCache.get(audio);
  if (entry && entry.ctx.state === 'suspended') entry.ctx.resume().catch(_NOOP);
}

export function hasAudioSource(audio: HTMLAudioElement): boolean {
  return audioSourceCache.has(audio);
}
