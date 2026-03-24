"use client";

import { useRef, useEffect } from "react";

export type PaintFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  freqData: Uint8Array | null,
) => void;

/** Shared RAF-driven canvas loop with DPR-aware sizing. */
export function useCanvasLoop(
  frequencyDataRef: React.RefObject<Uint8Array | null> | undefined,
  paint: PaintFn,
  dprScale = 1,
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const paintRef = useRef(paint);
  const freqRef = useRef(frequencyDataRef);

  useEffect(() => { paintRef.current = paint; });
  useEffect(() => { freqRef.current = frequencyDataRef; }, [frequencyDataRef]);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * dprScale;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);

      if (w < 1 || h < 1) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      paintRef.current(ctx, w, h, freqRef.current?.current ?? null);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dprScale]);

  return canvasRef;
}
