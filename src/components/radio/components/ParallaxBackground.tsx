'use client';

import React from 'react';
import { useParallaxBg } from '../hooks/useParallaxBg';

type Props = {
  faviconUrl?: string;
  genre?: string;
};

export default function ParallaxBackground({ faviconUrl, genre }: Props) {
  const { offset, containerRef, gradient } = useParallaxBg(genre);

  return (<div ref={containerRef} className="abs-fill overflow-hidden pointer-events-none">
      <div
        className="absolute inset-[-40px] transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          background: gradient,
          opacity: 0.15,
        }}/>
      {faviconUrl && (
        <div
          className="absolute inset-[-40px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${offset.x * 1.5}px, ${offset.y * 1.5}px)`,
          }}>
 <img src={faviconUrl} alt="" className="size-full object-cover blur-3xl opacity-20" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
        </div>
      )}
    </div>);
}
