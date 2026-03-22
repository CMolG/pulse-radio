"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface CircularRendererProps {
  frequencyData: Uint8Array | null;
  className?: string;
  color1?: string;
  color2?: string;
  sensitivity?: number;
  /** standalone demo mode — generates its own animation without audio */
  demo?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export function CircularRenderer({
  frequencyData,
  className = "",
  color1 = "#ff6b35",
  color2 = "#d4145a",
  sensitivity = 1.0,
  demo = false,
}: CircularRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);

  const colorsRef = useRef({
    c1: hexToRgb(color1),
    c2: hexToRgb(color2),
  });

  useEffect(() => {
    colorsRef.current = {
      c1: hexToRgb(color1),
      c2: hexToRgb(color2),
    };
  }, [color1, color2]);

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
    let dataArray: Uint8Array | null = frequencyData;
    let bufLen: number;

    if (dataArray) {
      bufLen = dataArray.length;
    } else if (demo) {
      bufLen = 128;
      const demoData = new Uint8Array(bufLen);
      for (let i = 0; i < bufLen; i++) {
        const base = 80 + Math.sin(t * 2 + i * 0.15) * 60;
        const ripple = Math.sin(t * 3.5 + i * 0.3) * 40;
        const pulse = Math.sin(t * 1.2) * 30;
        demoData[i] = Math.max(0, Math.min(255, base + ripple + pulse));
      }
      dataArray = demoData;
    } else {
      frameRef.current = requestAnimationFrame(render);
      return;
    }

    for (let i = 0; i < bufLen; i++) {
      const val = (dataArray[i] / 255) * sensitivity;
      const angle = (i / bufLen) * Math.PI * 2;
      const r = baseR + val * baseR * 1.5;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const norm = i / bufLen;

      const cr = Math.round(c1[0] + (c2[0] - c1[0]) * norm);
      const cg = Math.round(c1[1] + (c2[1] - c1[1]) * norm);
      const cb = Math.round(c1[2] + (c2[2] - c1[2]) * norm);
      const alpha = 0.5 + val * 0.5;

      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 3 + val * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner reference circle
    ctx.beginPath();
    ctx.arc(cx, cy, baseR - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    frameRef.current = requestAnimationFrame(render);
  }, [frequencyData, sensitivity, demo]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  }, [render]);

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
