/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GENRE_GRADIENTS } from '../constants';

export function useParallaxBg(genre?: string, audioAmplitude = 0) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const audioOffsetRef = useRef({ x: 0, y: 0 });
  const tickRafRef = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    // Coalesce rapid mouse events into a single rAF update
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = ((e.clientX - cx) / rect.width) * 20;
      const y = ((e.clientY - cy) / rect.height) * 20;
      pointerOffsetRef.current = { x, y };
    });
  }, []);

  useEffect(() => {
    const tick = () => {
      // Audio pulse is intentionally vertical-dominant with subtle horizontal drift.
      const a = Math.max(0, Math.min(1, audioAmplitude));
      audioOffsetRef.current = {
        x: a * 2.2,
        y: -a * 6.5,
      };
      setOffset({
        x: pointerOffsetRef.current.x + audioOffsetRef.current.x,
        y: pointerOffsetRef.current.y + audioOffsetRef.current.y,
      });
      tickRafRef.current = requestAnimationFrame(tick);
    };
    tickRafRef.current = requestAnimationFrame(tick);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(tickRafRef.current);
    };
  }, [audioAmplitude, handleMouseMove]);

  const gradient = genre
    ? GENRE_GRADIENTS[genre.toLowerCase()] || GENRE_GRADIENTS.default
    : GENRE_GRADIENTS.default;

  return { offset, containerRef, gradient };
}
