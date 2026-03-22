/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

// Shared cache for MediaElementAudioSourceNode instances.
// createMediaElementSource can only be called ONCE per HTMLAudioElement,
// so all consumers (EQ, visualizer, etc.) must share the same source node.

const cache = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; source: MediaElementAudioSourceNode }
>();

export function getOrCreateAudioSource(audio: HTMLAudioElement): {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
} {
  const existing = cache.get(audio);
  if (existing) {
    // Resume if suspended (Chrome autoplay policy)
    if (existing.ctx.state === 'suspended') {
      existing.ctx.resume().catch(() => {});
    }
    return existing;
  }

  const ctx = new AudioContext();
  // Resume immediately — callers invoke this from user-gesture-driven effects
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const source = ctx.createMediaElementSource(audio);
  const entry = { ctx, source };
  cache.set(audio, entry);
  return entry;
}
