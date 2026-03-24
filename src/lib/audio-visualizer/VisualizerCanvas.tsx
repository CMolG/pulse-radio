/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';
import React, { useRef, useEffect } from 'react';

interface VisualizerCanvasProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  mode?: 'bars' | 'wave';
  barCount?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function VisualizerCanvas({
  frequencyDataRef,
  mode = 'bars',
  barCount = 64,
  color = 'var(--accent-color)',
  opacity = 0.4,
  className = '',
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const resolvedColorRef = useRef<string | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const gradientCacheRef = useRef<{ key: string; gradient: CanvasGradient } | null>(null);
  const supportsRoundRectRef = useRef<boolean | null>(null);

  // Invalidate cached color when prop changes
  useEffect(() => {
    resolvedColorRef.current = null;
    gradientCacheRef.current = null;
  }, [color]);

  // Track size via ResizeObserver instead of getBoundingClientRect per frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const frequencyData = frequencyDataRef?.current;
      if (!canvas || !frequencyData) { frameRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resolve CSS variable once and cache
      if (!resolvedColorRef.current) {
        if (color.startsWith('var(')) {
          const varName = color.slice(4, -1).trim();
          const computed = getComputedStyle(canvas).getPropertyValue(varName).trim();
          resolvedColorRef.current = computed || '#34d399';
        } else resolvedColorRef.current = color;
      }
      const resolvedColor = resolvedColorRef.current;
      const { width, height } = sizeRef.current;
      if (width < 1 || height < 1) { frameRef.current = requestAnimationFrame(draw); return; }
      const dpr = devicePixelRatio;
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        gradientCacheRef.current = null;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (mode === 'bars') {
        const step = Math.max(1, Math.floor(frequencyData.length / barCount));
        const barWidth = width / barCount;
        const gap = barWidth * 0.2;

        // Cache gradient — only recreate on height or color change
        const gradKey = `${height}_${resolvedColor}`;
        let fillStyle: string | CanvasGradient = resolvedColor;
        if (gradientCacheRef.current?.key === gradKey) {
          fillStyle = gradientCacheRef.current.gradient;
        } else {
          try {
            const gradient = ctx.createLinearGradient(0, height, 0, 0);
            gradient.addColorStop(0, resolvedColor);
            gradient.addColorStop(1, 'transparent');
            fillStyle = gradient;
            gradientCacheRef.current = { key: gradKey, gradient };
          } catch { /* fallback to solid color */ }
        }
        ctx.fillStyle = fillStyle;

        // Feature-detect roundRect once instead of try-catch per bar
        if (supportsRoundRectRef.current === null) supportsRoundRectRef.current = typeof ctx.roundRect === 'function';
        const useRoundRect = supportsRoundRectRef.current;
        const radius = barWidth * 0.3;
        const radii: [number, number, number, number] = [radius, radius, 0, 0];

        for (let i = 0; i < barCount; i++) {
          const idx = Math.min(i * step, frequencyData.length - 1);
          const value = frequencyData[idx] / 255;
          const barHeight = value * height * 0.8;
          const x = i * barWidth + gap / 2;
          const y = height - barHeight;
          const w = barWidth - gap;
          ctx.beginPath();
          if (useRoundRect) {
            ctx.roundRect(x, y, w, barHeight, radii);
            ctx.fill();
          } else ctx.fillRect(x, y, w, barHeight);
        }
      } else {
        const step = width / frequencyData.length;
        ctx.strokeStyle = resolvedColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < frequencyData.length; i++) {
          const y = height - (frequencyData[i] / 255) * height * 0.6;
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i * step, y);
        }
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [frequencyDataRef, mode, barCount, color]);

  return (
    <canvas ref={canvasRef} className={`pointer-events-none ${className}`} style={{ opacity }} />
  );
}
