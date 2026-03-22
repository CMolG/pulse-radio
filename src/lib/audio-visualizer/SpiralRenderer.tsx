/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface SpiralRendererProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  className?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  sensitivity?: number;
  demo?: boolean;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rotationRef = useRef(0);
  const dataArrayRef = useRef(new Float64Array(NUM_BARS));
  const targetArrayRef = useRef(new Float64Array(NUM_BARS));
  const colorsRef = useRef({ color1, color2, color3 });

  useEffect(() => {
    colorsRef.current = { color1, color2, color3 };
  }, [color1, color2, color3]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    if (w < 1 || h < 1) {
      frameRef.current = requestAnimationFrame(render);
      return;
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const centerX = w / 2;
    const centerY = h / 2;

    // Update mock/frequency data
    const data = dataArrayRef.current;
    const target = targetArrayRef.current;
    const frequencyData = frequencyDataRef?.current ?? null;

    if (frequencyData && frequencyData.length > 0) {
      // Map real frequency data to our bars
      for (let i = 0; i < NUM_BARS; i++) {
        const srcIdx = Math.floor((i / NUM_BARS) * frequencyData.length);
        target[i] = (frequencyData[srcIdx] / 255) * sensitivity;
        data[i] += (target[i] - data[i]) * 0.15;
      }
    } else if (demo) {
      // Demo mode: organic simulated audio
      const t = performance.now() * 0.001;
      for (let i = 0; i < NUM_BARS; i++) {
        if (Math.random() < 0.08) {
          const maxVal = i < NUM_BARS / 3 ? 1.0 : 0.6;
          target[i] = Math.random() * maxVal * sensitivity;
        }
        data[i] += (target[i] - data[i]) * 0.1;
      }
    } else {
      // No data: decay
      for (let i = 0; i < NUM_BARS; i++) {
        data[i] *= 0.95;
      }
    }

    // Spatial smoothing (slime/goo effect — rounds peaks into smooth sigmoid curves)
    const smoothed = new Float64Array(NUM_BARS);
    smoothed.set(data);
    for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
      const temp = new Float64Array(smoothed);
      for (let i = 0; i < NUM_BARS; i++) {
        const prev = temp[i > 0 ? i - 1 : 0];
        const next = temp[i < NUM_BARS - 1 ? i + 1 : NUM_BARS - 1];
        smoothed[i] = prev * 0.25 + temp[i] * 0.5 + next * 0.25;
      }
    }

    // Spiral configuration
    const maxAngle = CYCLES * Math.PI * 2;
    const minRadius = Math.max(w, h) * 0.01;
    const maxRadius = Math.hypot(w, h) * 0.8;
    const b = Math.log(maxRadius / minRadius) / maxAngle;

    rotationRef.current += 0.0015;
    const rotation = rotationRef.current;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Gradient
    const { color1: c1, color2: c2, color3: c3 } = colorsRef.current;
    const gradient = ctx.createLinearGradient(
      centerX - maxRadius,
      centerY - maxRadius,
      centerX + maxRadius,
      centerY + maxRadius,
    );
    gradient.addColorStop(0, c1);
    gradient.addColorStop(0.5, c2);
    gradient.addColorStop(1, c3);

    // Build points
    const outerPoints: { x: number; y: number }[] = [];
    const innerPoints: { x: number; y: number }[] = [];

    for (let i = 0; i < NUM_BARS; i++) {
      const val = smoothed[i];
      const scaleFactor = 0.5 + 1.5 * (i / NUM_BARS);
      const barHeight = val * (Math.max(w, h) * 0.08) * scaleFactor;

      const baseAngle = (i / NUM_BARS) * maxAngle;
      const radius = minRadius * Math.exp(b * baseAngle);
      const finalAngle = baseAngle + rotation;

      const cos = Math.cos(finalAngle);
      const sin = Math.sin(finalAngle);

      innerPoints.push({
        x: centerX + cos * radius,
        y: centerY + sin * radius,
      });
      outerPoints.push({
        x: centerX + cos * (radius + barHeight + 2),
        y: centerY + sin * (radius + barHeight + 2),
      });
    }

    // Draw slime shapes per cycle
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `${c1}66`;
    ctx.globalAlpha = 0.85;

    const barsPerCycle = Math.ceil(NUM_BARS / CYCLES);

    for (let c = 0; c < CYCLES; c++) {
      const startIdx = c * barsPerCycle;
      const endIdx = Math.min((c + 1) * barsPerCycle + 2, NUM_BARS);
      if (startIdx >= NUM_BARS) break;

      const cycleOuter = outerPoints.slice(startIdx, endIdx);
      const cycleInner = innerPoints.slice(startIdx, endIdx);

      ctx.beginPath();

      // Outer edge with quadratic curves
      if (cycleOuter.length > 0) {
        ctx.moveTo(cycleOuter[0].x, cycleOuter[0].y);
        for (let i = 1; i < cycleOuter.length - 1; i++) {
          const xc = (cycleOuter[i].x + cycleOuter[i + 1].x) / 2;
          const yc = (cycleOuter[i].y + cycleOuter[i + 1].y) / 2;
          ctx.quadraticCurveTo(cycleOuter[i].x, cycleOuter[i].y, xc, yc);
        }
        ctx.lineTo(
          cycleOuter[cycleOuter.length - 1].x,
          cycleOuter[cycleOuter.length - 1].y,
        );
      }

      // Inner edge reversed
      if (cycleInner.length > 0) {
        ctx.lineTo(
          cycleInner[cycleInner.length - 1].x,
          cycleInner[cycleInner.length - 1].y,
        );
        for (let i = cycleInner.length - 2; i > 0; i--) {
          const xc = (cycleInner[i].x + cycleInner[i - 1].x) / 2;
          const yc = (cycleInner[i].y + cycleInner[i - 1].y) / 2;
          ctx.quadraticCurveTo(cycleInner[i].x, cycleInner[i].y, xc, yc);
        }
        ctx.lineTo(cycleInner[0].x, cycleInner[0].y);
      }

      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;

    frameRef.current = requestAnimationFrame(render);
  }, [sensitivity, demo]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  }, [render]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{ imageRendering: "auto", filter: "blur(6px)", transform: "scale(1.05)" }}
      />
    </div>
  );
}

export default SpiralRenderer;
