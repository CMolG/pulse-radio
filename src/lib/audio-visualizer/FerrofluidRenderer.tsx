/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';

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
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r || 0, g || 0, b || 0];
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

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
    const angle = (i / count) * Math.PI * 2;
    const dist = Math.min(w, h) * 0.15;
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

function drawMetaballs(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  w: number,
  h: number,
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] },
  energy: number,
) {
  const threshold = 1.0;

  // downscale for performance — render at 1/3 resolution
  const scale = 3;
  const sw = Math.ceil(w / scale);
  const sh = Math.ceil(h / scale);

  // Use an offscreen canvas for smooth bilinear upscaling
  let offscreen = (drawMetaballs as { _offscreen?: OffscreenCanvas })._offscreen;
  if (!offscreen || offscreen.width !== sw || offscreen.height !== sh) {
    offscreen = new OffscreenCanvas(sw, sh);
    (drawMetaballs as { _offscreen?: OffscreenCanvas })._offscreen = offscreen;
    // Invalidate cached ImageData when dimensions change
    (drawMetaballs as { _imgData?: ImageData })._imgData = undefined;
  }
  const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return;

  // Reuse ImageData across frames — every pixel is written below, so no zeroing needed
  let smallImg = (drawMetaballs as { _imgData?: ImageData })._imgData;
  if (!smallImg || smallImg.width !== sw || smallImg.height !== sh) {
    try {
      smallImg = offCtx.createImageData(sw, sh);
    } catch { return; }
    (drawMetaballs as { _imgData?: ImageData })._imgData = smallImg;
  }
  const sd = smallImg.data;

  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      const x = px * scale;
      const y = py * scale;
      let sum = 0;
      let weightedBand = 0;
      let totalWeight = 0;

      for (let b = 0; b < blobs.length; b++) {
        const blob = blobs[b];
        const dx = x - blob.x;
        const dy = y - blob.y;
        const distSq = dx * dx + dy * dy;
        const r = blob.baseRadius;
        const field = (r * r) / (distSq + 1);
        sum += field;

        if (field > 0.01) {
          weightedBand += blob.freqBand * field;
          totalWeight += field;
        }
      }

      const idx = (py * sw + px) * 4;

      if (sum > threshold) {
        const band = totalWeight > 0 ? weightedBand / totalWeight : 0;
        const bandNorm = band / 128;

        // color based on proximity to center vs edge, and energy
        const coreIntensity = Math.min(1, (sum - threshold) * 2);
        const edgeGlow = Math.max(0, 1 - coreIntensity);

        // blend primary → secondary based on frequency band
        const r = Math.round(lerp(colors.primary[0], colors.secondary[0], bandNorm) * (0.3 + coreIntensity * 0.7));
        const g = Math.round(lerp(colors.primary[1], colors.secondary[1], bandNorm) * (0.3 + coreIntensity * 0.7));
        const b = Math.round(lerp(colors.primary[2], colors.secondary[2], bandNorm) * (0.3 + coreIntensity * 0.7));

        // add accent glow at edges
        const accentMix = edgeGlow * energy * 0.6;
        sd[idx] = Math.min(255, r + Math.round(colors.accent[0] * accentMix));
        sd[idx + 1] = Math.min(255, g + Math.round(colors.accent[1] * accentMix));
        sd[idx + 2] = Math.min(255, b + Math.round(colors.accent[2] * accentMix));
        sd[idx + 3] = Math.round(Math.min(255, 180 + coreIntensity * 75));
      } else if (sum > threshold * 0.7) {
        // outer glow
        const glowIntensity = (sum - threshold * 0.7) / (threshold * 0.3);
        sd[idx] = Math.round(colors.accent[0] * glowIntensity * 0.4);
        sd[idx + 1] = Math.round(colors.accent[1] * glowIntensity * 0.4);
        sd[idx + 2] = Math.round(colors.accent[2] * glowIntensity * 0.4);
        sd[idx + 3] = Math.round(glowIntensity * 60);
      } else {
        sd[idx] = sd[idx + 1] = sd[idx + 2] = sd[idx + 3] = 0;
      }
    }
  }

  // Put image data into offscreen canvas, then draw upscaled with
  // bilinear interpolation (imageSmoothingEnabled) to eliminate aliasing
  try {
    offCtx.putImageData(smallImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, sw, sh, 0, 0, w, h);
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<Blob[]>([]);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const renderRef = useRef<() => void>(() => {});
  const frequencyDataRefRef = useRef(frequencyDataRef);

  const colors = useRef({
    primary: hexToRgb(colorPrimary),
    secondary: hexToRgb(colorSecondary),
    accent: hexToRgb(colorAccent),
  });

  useEffect(() => {
    colors.current = {
      primary: hexToRgb(colorPrimary),
      secondary: hexToRgb(colorSecondary),
      accent: hexToRgb(colorAccent),
    };
  }, [colorPrimary, colorSecondary, colorAccent]);

  useEffect(() => {
    frequencyDataRefRef.current = frequencyDataRef;
  }, [frequencyDataRef]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr * 0.5); // render at half DPR for performance
    const h = Math.round(rect.height * dpr * 0.5);

    if (w < 1 || h < 1) {
      frameRef.current = requestAnimationFrame(renderRef.current);
      return;
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // init blobs if needed
    if (
      blobsRef.current.length !== blobCount ||
      sizeRef.current.w !== w ||
      sizeRef.current.h !== h
    ) {
      blobsRef.current = createBlobs(blobCount, w, h);
      sizeRef.current = { w, h };
    }

    timeRef.current += 0.016;
    const t = timeRef.current;
    const blobs = blobsRef.current;
    const cx = w / 2;
    const cy = h / 2;

    // compute overall energy
    let energy = 0;
    const frequencyData = frequencyDataRefRef.current?.current ?? null;
    if (frequencyData) {
      let sum = 0;
      for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i];
      energy = (sum / frequencyData.length / 255) * sensitivity;
    } else if (demo) {
      energy = 0.3 + Math.sin(t * 0.5) * 0.2;
    }

    // update blobs
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const angle = blob.phase + t * blob.speed * 0.5;

      // base orbit
      const orbitRadius = Math.min(w, h) * (0.1 + energy * 0.25);
      blob.targetX = cx + Math.cos(angle) * orbitRadius;
      blob.targetY = cy + Math.sin(angle * 0.7) * orbitRadius * 0.8;

      // frequency-driven displacement
      if (frequencyData) {
        const bandIdx = Math.min(blob.freqBand, frequencyData.length - 1);
        const bandVal = frequencyData[bandIdx] / 255;
        const displacement = bandVal * Math.min(w, h) * 0.15 * sensitivity;
        const dispAngle = angle + Math.PI * 0.5;
        blob.targetX += Math.cos(dispAngle) * displacement;
        blob.targetY += Math.sin(dispAngle) * displacement;
      } else if (demo) {
        const demoDisp = Math.sin(t * 2 + i) * Math.min(w, h) * 0.08;
        blob.targetX += Math.cos(angle * 1.3) * demoDisp;
        blob.targetY += Math.sin(angle * 1.7) * demoDisp;
      }

      // smooth follow
      blob.vx += (blob.targetX - blob.x) * 0.08;
      blob.vy += (blob.targetY - blob.y) * 0.08;
      blob.vx *= 0.85;
      blob.vy *= 0.85;
      blob.x += blob.vx;
      blob.y += blob.vy;

      // pulse radius with energy
      const bandVal = frequencyData
        ? frequencyData[Math.min(blob.freqBand, frequencyData.length - 1)] / 255
        : demo
          ? 0.4 + Math.sin(t * 3 + i * 0.8) * 0.3
          : 0.3;
      blob.baseRadius =
        Math.min(w, h) * (0.04 + blob.sizeFactor * 0.01) +
        bandVal * Math.min(w, h) * 0.06 * sensitivity;
    }

    // clear
    ctx.clearRect(0, 0, w, h);

    // draw metaballs
    drawMetaballs(ctx, blobs, w, h, colors.current, energy);

    frameRef.current = requestAnimationFrame(renderRef.current);
  }, [blobCount, sensitivity, demo]);

  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(renderRef.current);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{ imageRendering: 'auto' }}
      />
      {/* SVG filter for smoothing the metaballs */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="ferrofluid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export default FerrofluidRenderer;
