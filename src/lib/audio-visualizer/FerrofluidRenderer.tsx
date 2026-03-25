/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useRef, useEffect } from 'react';

interface FerrofluidRendererProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  className?: string;
  blobCount?: number;
  colorPrimary?: string;
  colorSecondary?: string;
  colorAccent?: string;
  sensitivity?: number;
  /** standalone demo mode — generates its own animation without audio */
  demo?: boolean;
}

/* ─── helpers ─── */
import { hexToRgb } from './colorUtils';
import { useCanvasLoop } from './useCanvasLoop';

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* ─── blob state ─── */
interface Blob {
  x: number;
  y: number;
  baseRadius: number;
  /** Per-blob random size factor (0–1), assigned once at creation */
  sizeFactor: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  freqBand: number; // which frequency band drives this blob
}

function createBlobs(count: number, w: number, h: number): Blob[] {
  const blobs: Blob[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2; const dist = Math.min(w, h) * 0.15;
    blobs.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      baseRadius: Math.min(w, h) * (0.04 + Math.random() * 0.06),
      sizeFactor: Math.random(),
      targetX: cx,
      targetY: cy,
      vx: 0,
      vy: 0,
      phase: (i / count) * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      freqBand: Math.floor((i / count) * 128),
    });
  }
  return blobs;
}

/* ─── drawing ─── */

// Module-level cache for offscreen canvas and ImageData (avoids function property hacks)
let _offscreen: OffscreenCanvas | null = null;
let _imgData: ImageData | undefined;

function drawMetaballs( ctx: CanvasRenderingContext2D, blobs: Blob[], w: number, h: number,
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] },
  energy: number, ) {
  const threshold = 1.0;
  // downscale for performance — render at 1/3 resolution
  const scale = 3;
  const sw = Math.ceil(w / scale);
  const sh = Math.ceil(h / scale);
  // Use an offscreen canvas for smooth bilinear upscaling
  if (!_offscreen || _offscreen.width !== sw || _offscreen.height !== sh) {
    _offscreen = new OffscreenCanvas(sw, sh); _imgData = undefined;
  }
  const offCtx = _offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return;
  // Reuse ImageData across frames — every pixel is written below, so no zeroing needed
  if (!_imgData || _imgData.width !== sw || _imgData.height !== sh) {
    try { _imgData = offCtx.createImageData(sw, sh); } catch { return; }
  }
  const sd = _imgData.data;
  // Pre-compute per-blob max influence radius squared for distance culling.
  // field = r² / (distSq + 1). For field >= 0.01 → distSq < r²/0.01 = 100*r²
  const blobCount = blobs.length;
  const blobMaxDistSq = new Float64Array(blobCount);
  for (let b = 0; b < blobCount; b++) { const r = blobs[b].baseRadius; blobMaxDistSq[b] = r * r * 100; }
  const thresholdLow = threshold * 0.7;
  const glowRange = threshold * 0.3;
  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      const x = px * scale; const y = py * scale; let sum = 0; let weightedBand = 0;
      let totalWeight = 0;
      for (let b = 0; b < blobCount; b++) {
        const blob = blobs[b]; const dx = x - blob.x; const dy = y - blob.y; const distSq = dx * dx + dy * dy;
        // Early-exit: skip blobs too far to contribute meaningfully
        if (distSq > blobMaxDistSq[b]) continue;
        const r = blob.baseRadius; const field = (r * r) / (distSq + 1); sum += field;
        if (field > 0.01) { weightedBand += blob.freqBand * field; totalWeight += field; }
      }
      const idx = (py * sw + px) * 4;
      if (sum > threshold) {
        const band = totalWeight > 0 ? weightedBand / totalWeight : 0; const bandNorm = band / 128;
        // color based on proximity to center vs edge, and energy
        const coreIntensity = Math.min(1, (sum - threshold) * 2);
        const edgeGlow = 1 - coreIntensity; const brightnessMul = 0.3 + coreIntensity * 0.7;
        // blend primary → secondary based on frequency band
        const r = (lerp(colors.primary[0], colors.secondary[0], bandNorm) * brightnessMul) | 0;
        const g = (lerp(colors.primary[1], colors.secondary[1], bandNorm) * brightnessMul) | 0;
        const b = (lerp(colors.primary[2], colors.secondary[2], bandNorm) * brightnessMul) | 0;
        // add accent glow at edges
        const accentMix = edgeGlow * energy * 0.6; sd[idx] = Math.min(255, r + (colors.accent[0] * accentMix) | 0);
        sd[idx + 1] = Math.min(255, g + (colors.accent[1] * accentMix) | 0);
        sd[idx + 2] = Math.min(255, b + (colors.accent[2] * accentMix) | 0);
        sd[idx + 3] = Math.min(255, (180 + coreIntensity * 75) | 0);
      } else if (sum > thresholdLow) {
        // outer glow
        const glowIntensity = (sum - thresholdLow) / glowRange; sd[idx] = (colors.accent[0] * glowIntensity * 0.4) | 0;
        sd[idx + 1] = (colors.accent[1] * glowIntensity * 0.4) | 0;
        sd[idx + 2] = (colors.accent[2] * glowIntensity * 0.4) | 0; sd[idx + 3] = (glowIntensity * 60) | 0;
      } else sd[idx] = sd[idx + 1] = sd[idx + 2] = sd[idx + 3] = 0;
    }
  }
  // Put image data into offscreen canvas, then draw upscaled with
  // bilinear interpolation (imageSmoothingEnabled) to eliminate aliasing
  try {
    offCtx.putImageData(_imgData, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(_offscreen, 0, 0, sw, sh, 0, 0, w, h);
  } catch { /* skip frame on canvas error */ }
}

/* ─── component ─── */

export function FerrofluidRenderer({
  frequencyDataRef,
  className = '',
  blobCount = 12,
  colorPrimary = '#1a1a2e',
  colorSecondary = '#16213e',
  colorAccent = '#0f3460',
  sensitivity = 1.0,
  demo = false,
}: FerrofluidRendererProps) {
  const blobsRef = useRef<Blob[]>([]);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const mkColors = () => ({ primary: hexToRgb(colorPrimary), secondary: hexToRgb(colorSecondary), accent: hexToRgb(colorAccent) });
  const colors = useRef(mkColors());
  useEffect(() => { colors.current = mkColors(); }, [colorPrimary, colorSecondary, colorAccent]);
  const canvasRef = useCanvasLoop(frequencyDataRef, (ctx, w, h, freqData) => {
    // init blobs if needed
    if (blobsRef.current.length !== blobCount || sizeRef.current.w !== w || sizeRef.current.h !== h) {
      blobsRef.current = createBlobs(blobCount, w, h); sizeRef.current = { w, h };
    }
    timeRef.current += 0.016; const t = timeRef.current;
    const blobs = blobsRef.current; const cx = w / 2; const cy = h / 2;
    // compute overall energy
    let energy = 0; const frequencyData = freqData;
    if (frequencyData) {
      let sum = 0;
      for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i];
      energy = (sum / frequencyData.length / 255) * sensitivity;
    } else if (demo) energy = 0.3 + Math.sin(t * 0.5) * 0.2;
    // update blobs
    const minWH = Math.min(w, h);
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i]; const angle = blob.phase + t * blob.speed * 0.5;
      const bandIdx = Math.min(blob.freqBand, frequencyData ? frequencyData.length - 1 : 127);
      // base orbit
      const orbitRadius = minWH * (0.1 + energy * 0.25);
      blob.targetX = cx + Math.cos(angle) * orbitRadius; blob.targetY = cy + Math.sin(angle * 0.7) * orbitRadius * 0.8;
      // frequency-driven displacement
      let bandVal: number;
      if (frequencyData) {
        bandVal = frequencyData[bandIdx] / 255;
        const displacement = bandVal * minWH * 0.15 * sensitivity; const dispAngle = angle + Math.PI * 0.5;
        blob.targetX += Math.cos(dispAngle) * displacement; blob.targetY += Math.sin(dispAngle) * displacement;
      } else if (demo) {
        bandVal = 0.4 + Math.sin(t * 3 + i * 0.8) * 0.3; const demoDisp = Math.sin(t * 2 + i) * minWH * 0.08;
        blob.targetX += Math.cos(angle * 1.3) * demoDisp; blob.targetY += Math.sin(angle * 1.7) * demoDisp;
      } else bandVal = 0.3;
      // smooth follow
      blob.vx += (blob.targetX - blob.x) * 0.08; blob.vy += (blob.targetY - blob.y) * 0.08;
      blob.vx *= 0.85; blob.vy *= 0.85; blob.x += blob.vx; blob.y += blob.vy;
      // pulse radius with energy (reuses cached bandVal and minWH)
      blob.baseRadius = minWH * (0.04 + blob.sizeFactor * 0.01) + bandVal * minWH * 0.06 * sensitivity;
    }
    // clear
    ctx.clearRect(0, 0, w, h);
    // draw metaballs
    drawMetaballs(ctx, blobs, w, h, colors.current, energy);
  }, 0.5);
  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="size-full" style={{ imageRendering: 'auto' }} />
      {/* SVG filter for smoothing the metaballs */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="ferrofluid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter></defs></svg>
    </div>
  );
}

export default FerrofluidRenderer;
