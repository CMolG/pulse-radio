'use client';
import React, { useRef, useEffect } from 'react';

interface VisualizerCanvasProps {
  frequencyData: Uint8Array | null;
  mode?: 'bars' | 'wave';
  barCount?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export function VisualizerCanvas({
  frequencyData,
  mode = 'bars',
  barCount = 64,
  color = 'var(--accent-color)',
  opacity = 0.4,
  className = '',
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frequencyData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolve CSS variables to actual color values for Canvas API
    let resolvedColor = color;
    if (color.startsWith('var(')) {
      const varName = color.slice(4, -1).trim();
      const computed = getComputedStyle(canvas).getPropertyValue(varName).trim();
      resolvedColor = computed || '#34d399'; // fallback green
    }

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    if (mode === 'bars') {
      const step = Math.max(1, Math.floor(frequencyData.length / barCount));
      const barWidth = width / barCount;
      const gap = barWidth * 0.2;
      for (let i = 0; i < barCount; i++) {
        const value = frequencyData[i * step] / 255;
        const barHeight = value * height * 0.8;
        const gradient = ctx.createLinearGradient(
          0,
          height,
          0,
          height - barHeight,
        );
        gradient.addColorStop(0, resolvedColor);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          i * barWidth + gap / 2,
          height - barHeight,
          barWidth - gap,
          barHeight,
          [barWidth * 0.3, barWidth * 0.3, 0, 0],
        );
        ctx.fill();
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
  }, [frequencyData, mode, barCount, color]);

  if (!frequencyData) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ opacity }}
    />
  );
}
