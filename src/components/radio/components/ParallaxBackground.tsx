/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React from 'react';
import { useParallaxBg } from '../hooks/useParallaxBg';
import UiImage from '@/components/common/UiImage';

type Props = {
  faviconUrl?: string;
  genre?: string;
  audioAmplitude?: number;
  landingMode?: boolean;
};

export default function ParallaxBackground({ faviconUrl, genre, audioAmplitude = 0, landingMode = false }: Props) {
  const { offset, containerRef, gradient } = useParallaxBg(genre, audioAmplitude);

  const baseGradient = landingMode
    ? 'radial-gradient(120% 100% at 50% 8%, rgba(112,112,112,0.18) 0%, rgba(44,44,44,0.16) 35%, rgba(24,24,24,0.92) 100%)'
    : gradient;

  return (<div ref={containerRef} className="abs-fill overflow-hidden pointer-events-none">
      <div
        className="absolute inset-[-40px] transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          background: baseGradient,
          opacity: landingMode ? 0.85 : 0.15,
        }}/>
      {landingMode && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(140% 120% at 50% 40%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      )}
      {faviconUrl && (
        <div
          className="absolute inset-[-40px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${offset.x * 1.5}px, ${offset.y * 1.5}px)`,
          }}>
          <UiImage
            src={faviconUrl}
            alt=""
            className={`object-cover blur-3xl ${landingMode ? 'opacity-10' : 'opacity-20'}`}
            sizes="100vw"
          />
        </div>
      )}
    </div>);
}
