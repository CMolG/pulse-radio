/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useRef, useEffect } from "react";

interface SpiralRendererProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  className?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  sensitivity?: number;
  demo?: boolean;
}

import { useCanvasLoop } from './useCanvasLoop';

const NUM_BARS = 250;
const CYCLES = 4;
const SMOOTH_PASSES = 3;

export function SpiralRenderer({
  frequencyDataRef,
  className = "",
  color1 = "#ff4b1f",
  color2 = "#ff9068",
  color3 = "#f9d423",
  sensitivity = 1.0,
  demo = false,
}: SpiralRendererProps) {
  const rotationRef = useRef(0);
  const dataArrayRef = useRef(new Float64Array(NUM_BARS));
  const targetArrayRef = useRef(new Float64Array(NUM_BARS));
  const smoothedRef = useRef(new Float64Array(NUM_BARS));
  const tempRef = useRef(new Float64Array(NUM_BARS));
  // Pre-allocated coordinate arrays — avoids 500+ object allocations per frame
  const outerXRef = useRef(new Float64Array(NUM_BARS));
  const outerYRef = useRef(new Float64Array(NUM_BARS));
  const innerXRef = useRef(new Float64Array(NUM_BARS));
  const innerYRef = useRef(new Float64Array(NUM_BARS));
  const colorsRef = useRef({ color1, color2, color3 });

  useEffect(() => { colorsRef.current = { color1, color2, color3 }; }, [color1, color2, color3]);

  const canvasRef = useCanvasLoop(frequencyDataRef, (ctx, w, h, freqData) => {
    const centerX = w / 2;
    const centerY = h / 2;

    // Update mock/frequency data
    const data = dataArrayRef.current;
    const target = targetArrayRef.current;
    const frequencyData = freqData;

    if (frequencyData && frequencyData.length > 0) {
      // Map real frequency data to our bars
      for (let i = 0; i < NUM_BARS; i++) {
        const srcIdx = Math.min(
          Math.floor((i / NUM_BARS) * frequencyData.length),
          frequencyData.length - 1,
        );
        target[i] = (frequencyData[srcIdx] / 255) * sensitivity;
        data[i] += (target[i] - data[i]) * 0.15;
      }
    } else if (demo) {
      // Demo mode: organic simulated audio
      for (let i = 0; i < NUM_BARS; i++) {
        if (Math.random() < 0.08) {
          const maxVal = i < NUM_BARS / 3 ? 1.0 : 0.6;
          target[i] = Math.random() * maxVal * sensitivity;
        }
        data[i] += (target[i] - data[i]) * 0.1;
      }
    } else {
      // No data: decay
      for (let i = 0; i < NUM_BARS; i++) { data[i] *= 0.95; }
    }

    // Spatial smoothing (slime/goo effect — rounds peaks into smooth sigmoid curves)
    // Ping-pong buffers: alternate read/write to avoid full-array copy per pass
    const smoothed = smoothedRef.current;
    const temp = tempRef.current;
    let src = data;
    let dst = smoothed;
    for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
      for (let i = 0; i < NUM_BARS; i++) {
        const prev = src[i > 0 ? i - 1 : 0];
        const next = src[i < NUM_BARS - 1 ? i + 1 : NUM_BARS - 1];
        dst[i] = prev * 0.25 + src[i] * 0.5 + next * 0.25;
      }
      // Swap: previous dst becomes next src
      const swap = src === data ? temp : src;
      src = dst;
      dst = swap;
    }
    // After SMOOTH_PASSES iterations, result is in `src`
    const result = src;

    // Spiral configuration
    const maxAngle = CYCLES * Math.PI * 2;
    const minRadius = Math.max(w, h) * 0.01;
    const maxRadius = Math.sqrt(w * w + h * h) * 0.8;
    const b = Math.log(maxRadius / minRadius) / maxAngle;

    rotationRef.current += 0.0015;
    const rotation = rotationRef.current;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Gradient
    const { color1: c1, color2: c2, color3: c3 } = colorsRef.current;
    let fillStyle: string | CanvasGradient = c1;
    try {
      const gradient = ctx.createLinearGradient(
        centerX - maxRadius,
        centerY - maxRadius,
        centerX + maxRadius,
        centerY + maxRadius,
      );
      gradient.addColorStop(0, c1);
      gradient.addColorStop(0.5, c2);
      gradient.addColorStop(1, c3);
      fillStyle = gradient;
    } catch { /* fallback to solid color */ }

    // Build points into pre-allocated arrays (avoids 500+ object allocs/frame)
    const outerX = outerXRef.current;
    const outerY = outerYRef.current;
    const innerX = innerXRef.current;
    const innerY = innerYRef.current;

    for (let i = 0; i < NUM_BARS; i++) {
      const val = result[i];
      const scaleFactor = 0.5 + 1.5 * (i / NUM_BARS);
      const barHeight = val * (Math.max(w, h) * 0.08) * scaleFactor;
      const baseAngle = (i / NUM_BARS) * maxAngle;
      const radius = minRadius * Math.exp(b * baseAngle);
      const finalAngle = baseAngle + rotation;
      const cos = Math.cos(finalAngle);
      const sin = Math.sin(finalAngle);

      innerX[i] = centerX + cos * radius;
      innerY[i] = centerY + sin * radius;
      outerX[i] = centerX + cos * (radius + barHeight + 2);
      outerY[i] = centerY + sin * (radius + barHeight + 2);
    }

    // Draw slime shapes per cycle
    ctx.fillStyle = fillStyle;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `${c1}66`;
    ctx.globalAlpha = 0.85;

    const barsPerCycle = Math.ceil(NUM_BARS / CYCLES);

    for (let c = 0; c < CYCLES; c++) {
      const startIdx = c * barsPerCycle;
      const endIdx = Math.min((c + 1) * barsPerCycle + 2, NUM_BARS);
      if (startIdx >= NUM_BARS) break;

      ctx.beginPath();

      // Outer edge with quadratic curves
      ctx.moveTo(outerX[startIdx], outerY[startIdx]);
      for (let i = startIdx + 1; i < endIdx - 1; i++) {
        const xc = (outerX[i] + outerX[i + 1]) / 2;
        const yc = (outerY[i] + outerY[i + 1]) / 2;
        ctx.quadraticCurveTo(outerX[i], outerY[i], xc, yc);
      }
      if (endIdx - 1 > startIdx) ctx.lineTo(outerX[endIdx - 1], outerY[endIdx - 1]);

      // Inner edge reversed
      ctx.lineTo(innerX[endIdx - 1], innerY[endIdx - 1]);
      for (let i = endIdx - 2; i > startIdx; i--) {
        const xc = (innerX[i] + innerX[i - 1]) / 2;
        const yc = (innerY[i] + innerY[i - 1]) / 2;
        ctx.quadraticCurveTo(innerX[i], innerY[i], xc, yc);
      }
      ctx.lineTo(innerX[startIdx], innerY[startIdx]);

      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  });

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ WebkitFilter: "blur(6px)", filter: "blur(6px)" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        style={{ imageRendering: "auto", transform: "scale(1.12)" }}
      />
    </div>
  );
}

export default SpiralRenderer;
