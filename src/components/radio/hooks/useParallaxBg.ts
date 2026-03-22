/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GENRE_GRADIENTS } from '../constants';

export function useParallaxBg(genre?: string) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = ((e.clientX - cx) / rect.width) * 20;
    const y = ((e.clientY - cy) / rect.height) * 20;
    setOffset({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const gradient = genre
    ? GENRE_GRADIENTS[genre.toLowerCase()] || GENRE_GRADIENTS.default
    : GENRE_GRADIENTS.default;

  return { offset, containerRef, gradient };
}
