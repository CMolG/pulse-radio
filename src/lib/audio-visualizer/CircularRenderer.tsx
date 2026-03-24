/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useRef, useEffect } from "react";

interface CircularRendererProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  className?: string;
  color1?: string;
  color2?: string;
  sensitivity?: number;
  /** standalone demo mode — generates its own animation without audio */
  demo?: boolean;
}

import { hexToRgb } from './colorUtils';
import { useCanvasLoop } from './useCanvasLoop';

export function CircularRenderer({
  frequencyDataRef,
  className = "",
  color1 = "#ff6b35",
  color2 = "#d4145a",
  sensitivity = 1.0,
  demo = false,
}: CircularRendererProps) {
  const timeRef = useRef(0);
  const demoBufferRef = useRef(new Uint8Array(128));
  // Pre-computed position-based color strings — RGB doesn't depend on audio data,
  // only on the gradient position (i/bufLen). Rebuilt when colors change.
  const colorStringsRef = useRef<string[]>([]);

  const colorsRef = useRef({
    c1: hexToRgb(color1),
    c2: hexToRgb(color2),
  });

  useEffect(() => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    colorsRef.current = { c1, c2 };
    // Rebuild position-based color strings (128 entries for 128 bars)
    const strings: string[] = new Array(128);
    for (let i = 0; i < 128; i++) {
      const norm = i / 128;
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * norm);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * norm);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * norm);
      strings[i] = `rgb(${r},${g},${b})`;
    }
    colorStringsRef.current = strings;
  }, [color1, color2]);

  const canvasRef = useCanvasLoop(frequencyDataRef, (ctx, w, h, freqData) => {

    timeRef.current += 0.016;
    const t = timeRef.current;

    // Fade previous frame for trailing effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const baseR = Math.min(w, h) * 0.2;
    const { c1, c2 } = colorsRef.current;

    // Build or use demo data
    let dataArray: Uint8Array | null = freqData;
    let bufLen: number;

    if (dataArray) {
      bufLen = dataArray.length;
    } else if (demo) {
      bufLen = 128;
      const demoData = demoBufferRef.current;
      for (let i = 0; i < bufLen; i++) {
        const base = 80 + Math.sin(t * 2 + i * 0.15) * 60;
        const ripple = Math.sin(t * 3.5 + i * 0.3) * 40;
        const pulse = Math.sin(t * 1.2) * 30;
        demoData[i] = Math.max(0, Math.min(255, base + ripple + pulse));
      }
      dataArray = demoData;
    } else {
      return;
    }

    const colorStrings = colorStringsRef.current;
    const hasColorStrings = colorStrings.length >= bufLen;

    for (let i = 0; i < bufLen; i++) {
      const val = (dataArray[i] / 255) * sensitivity;
      const angle = (i / bufLen) * Math.PI * 2;
      const r = baseR + val * baseR * 1.5;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      if (hasColorStrings) {
        ctx.fillStyle = colorStrings[i];
        ctx.globalAlpha = 0.5 + val * 0.5;
      } else {
        const norm = i / bufLen;
        const cr = Math.round(c1[0] + (c2[0] - c1[0]) * norm);
        const cg = Math.round(c1[1] + (c2[1] - c1[1]) * norm);
        const cb = Math.round(c1[2] + (c2[2] - c1[2]) * norm);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.5 + val * 0.5})`;
      }

      ctx.beginPath();
      ctx.arc(x, y, 3 + val * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Inner reference circle
    ctx.beginPath();
    ctx.arc(cx, cy, baseR - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="size-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

export default CircularRenderer;
