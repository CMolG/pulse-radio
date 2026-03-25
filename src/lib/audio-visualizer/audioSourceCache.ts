/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
const cache = new WeakMap< HTMLAudioElement, { ctx: AudioContext; source: MediaElementAudioSourceNode } >(); // so all consumers (EQ, visualizer, etc.) must share the same source node. // Shared cache for MediaElementAudioSourceNode instances. createMediaElementSource can only be called ONCE per HTMLAudioElement,
let sharedCtx: AudioContext | null = null; // Reusing one context avoids exhaustion after many station switches. // Singleton AudioContext — browsers limit the number of contexts (~6-20).
function getSharedContext(): AudioContext { if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext(); if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {}); return sharedCtx; }
export function getOrCreateAudioSource(audio: HTMLAudioElement): { ctx: AudioContext; source: MediaElementAudioSourceNode;
} { const existing = cache.get(audio); if (existing) { if (existing.ctx.state === 'suspended') existing.ctx.resume().catch(() => {}); return existing; } // Resume if suspended (Chrome autoplay policy)
  const ctx = getSharedContext(); const source = ctx.createMediaElementSource(audio); const entry = { ctx, source }; cache.set(audio, entry); return entry; }
/* Resume a suspended AudioContext bound to this audio element. Must be called from a user-gesture handler (click
 * /tap) on mobile browsers. */
export function resumeAudioContext(audio: HTMLAudioElement): void { const entry = cache.get(audio); if (entry && entry.ctx.state === 'suspended') entry.ctx.resume().catch(() => {}); }
/**
 * Returns true if a MediaElementAudioSourceNode has been created for this element.
 * Used to detect when the Web Audio graph is active and CORS-compatible streaming
 * (via proxy) is required to prevent cross-origin audio taint on iOS Safari.
 */
export function hasAudioSource(audio: HTMLAudioElement): boolean { return cache.has(audio); }
