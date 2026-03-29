/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useCallback, useEffect, useRef } from 'react';
import { GENRE_GRADIENTS } from '@/components/radio/constants';

const _EVT_PASSIVE: AddEventListenerOptions = { passive: true };

export function useParallaxBg(genre?: string, audioAmplitude = 0) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const audioOffsetRef = useRef({ x: 0, y: 0 });
  const tickRafRef = useRef(0);
  const audioAmplitudeRef = useRef(audioAmplitude);
  useEffect(() => {
    audioAmplitudeRef.current = audioAmplitude;
  }, [audioAmplitude]);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
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
  const lastPublishedRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const tick = () => {
      const a = Math.max(0, Math.min(1, audioAmplitudeRef.current));
      audioOffsetRef.current = { x: a * 2.2, y: -a * 6.5 };
      const nextX = pointerOffsetRef.current.x + audioOffsetRef.current.x;
      const nextY = pointerOffsetRef.current.y + audioOffsetRef.current.y;
      if (
        Math.abs(nextX - lastPublishedRef.current.x) >= 0.05 ||
        Math.abs(nextY - lastPublishedRef.current.y) >= 0.05
      ) {
        lastPublishedRef.current = { x: nextX, y: nextY };
        setOffset(lastPublishedRef.current);
      }
      tickRafRef.current = requestAnimationFrame(tick);
    };
    tickRafRef.current = requestAnimationFrame(tick);
    window.addEventListener('mousemove', handleMouseMove, _EVT_PASSIVE);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(tickRafRef.current);
    };
  }, [handleMouseMove]);
  const gradient = genre
    ? GENRE_GRADIENTS[genre.toLowerCase()] || GENRE_GRADIENTS.default
    : GENRE_GRADIENTS.default;
  return { offset, containerRef, gradient };
}
