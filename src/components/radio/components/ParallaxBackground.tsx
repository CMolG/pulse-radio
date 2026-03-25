/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React from 'react';
import { useParallaxBg } from '../hooks/useParallaxBg';
import UiImage from '@/components/common/UiImage';
type Props = { faviconUrl?: string; genre?: string; audioAmplitude?: number; landingMode?: boolean; };
const BF_STYLE: React.CSSProperties = { WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' };
const BLUR_STYLE: React.CSSProperties = { filter: 'blur(64px)', WebkitFilter: 'blur(64px)',
  transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)', };
const RADIAL_OVERLAY: React.CSSProperties = {
  background: 'radial-gradient(140% 120% at 50% 40%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)', };
function ParallaxBackground({ faviconUrl, genre, audioAmplitude = 0, landingMode = false }: Props) {
  const { offset, containerRef, gradient } = useParallaxBg(genre, audioAmplitude);
  const baseGradient = landingMode ? 'radial-gradient(120% 100% at 50% 8%, rgba(112,112,112,0.18) 0%, rgba(44,44,44,0.16) 35%, rgba(24,24,24,0.92) 100%)' : gradient;
  return (<div ref={containerRef} className="abs-fill overflow-hidden pointer-events-none"><div
        className="absolute inset-[-40px] transition-transform duration-300 ease-out"
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          WebkitTransform: `translate3d(${offset.x}px, ${offset.y}px, 0)`, background: baseGradient,
          opacity: landingMode ? 0.85 : 0.15, willChange: 'transform', }}/>
      {landingMode && ( <div className="absolute inset-0" style={RADIAL_OVERLAY} />
      )}
      {faviconUrl && ( <div
          className="absolute inset-[-40px] transition-transform duration-300 ease-out"
          style={{ transform: `translate3d(${offset.x * 1.5}px, ${offset.y * 1.5}px, 0)`,
            WebkitTransform: `translate3d(${offset.x * 1.5}px, ${offset.y * 1.5}px, 0)`, willChange: 'transform',
          }}> {/* Separate blur layer for iOS GPU compositing */}
          <div className="absolute inset-0" style={BF_STYLE}><UiImage
              src={faviconUrl}
              alt=""
              className={`object-cover ${landingMode ? 'opacity-10' : 'opacity-20'}`}
              sizes="100vw"
              style={BLUR_STYLE} /></div></div>
      )}
    </div>);
}
export default React.memo(ParallaxBackground);
