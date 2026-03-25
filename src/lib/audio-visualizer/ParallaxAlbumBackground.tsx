/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import React, { useState } from 'react'; import Image from 'next/image';
interface ParallaxAlbumBackgroundProps {
  imageUrl: string | null; fallbackUrl?: string; blurClass?: string; overlayClass?: string;
  enableDrift?: boolean; showTopGlow?: boolean; children?: React.ReactNode; }
export function ParallaxAlbumBackground({ imageUrl, fallbackUrl, blurClass = 'blur-2xl', overlayClass = 'bg-black/50',
  enableDrift = true, showTopGlow = true, children,
}: ParallaxAlbumBackgroundProps) { const [imgError, setImgError] = useState(false);
  // Reset error state when image URL changes so new artwork gets a chance to load
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  if (imageUrl !== prevImageUrl) { setPrevImageUrl(imageUrl); setImgError(false); }
  const src = (!imgError && imageUrl) || fallbackUrl || null;
  return ( <div className="absolute inset-0 overflow-hidden"> {src && ( <Image src={src} alt="" fill
          style={{ objectFit: 'cover' }}
          className={`${blurClass} ${enableDrift ? 'animate-ambient-drift scale-105' : 'scale-110'} transition-[filter] duration-1000`}
          onError={() => setImgError(true)} unoptimized={src.startsWith('http')} />
      )} {!src && ( <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
      )} <div className={`absolute inset-0 ${overlayClass} backdrop-blur-sm`} /> {showTopGlow && (
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      )} {children}</div>
  ); }
