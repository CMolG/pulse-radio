/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import React, { useEffect, useRef } from 'react';

type PaintFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  freqData: Uint8Array | null,
) => void;

/** Returns true on touch-capable devices (mobile/tablet). Used to throttle canvas FPS. */
const _isTouchDevice =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Shared RAF-driven canvas loop with DPR-aware sizing.
 *  Pauses when document is hidden; throttles to ~30fps on touch devices. */
export function useCanvasLoop(
  frequencyDataRef: React.RefObject<Uint8Array | null> | undefined,
  paint: PaintFn,
  dprScale = 1,
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const paintRef = useRef(paint);
  const freqRef = useRef(frequencyDataRef);
  const sizeRef = useRef({ w: 0, h: 0 });
  const lastPaintRef = useRef(0);
  // ~30fps on mobile (33ms), uncapped on desktop
  const minFrameMs = _isTouchDevice ? 33 : 0;
  useEffect(() => {
    paintRef.current = paint;
  });
  useEffect(() => {
    freqRef.current = frequencyDataRef;
  }, [frequencyDataRef]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * dprScale;
      sizeRef.current = { w: Math.round(rect.width * dpr), h: Math.round(rect.height * dpr) };
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [dprScale]);
  useEffect(() => {
    const loop = (now: number) => {
      frameRef.current = requestAnimationFrame(loop);
      // Pause rendering when tab/PWA is hidden
      if (document.hidden) return;
      // Throttle to target FPS on mobile
      if (minFrameMs > 0 && now - lastPaintRef.current < minFrameMs) return;
      lastPaintRef.current = now;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      if (w < 1 || h < 1) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      paintRef.current(ctx, w, h, freqRef.current?.current ?? null);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dprScale, minFrameMs]);
  return canvasRef;
}
