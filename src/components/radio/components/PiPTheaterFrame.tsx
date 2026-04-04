/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import React from 'react';

interface PiPTheaterFrameProps {
  station: { name: string; favicon?: string } | null;
  track: { title: string; artist: string; artworkUrl?: string } | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReturn: () => void;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#0a0f1a',
  color: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  userSelect: 'none',
};

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  backdropFilter: 'blur(24px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  padding: '20px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  maxWidth: '360px',
  boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
};

const artworkStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '14px',
  objectFit: 'cover',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  flexShrink: 0,
};

const artworkFallbackStyle: React.CSSProperties = {
  ...artworkStyle,
  background: 'linear-gradient(135deg, #8b2fc9, #c44569, #f97848)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.9)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: '#fff',
  textAlign: 'center',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.6)',
  textAlign: 'center',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
};

const stationNameStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.35)',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '16px',
  marginTop: '6px',
};

const playButtonStyle: React.CSSProperties = {
  width: '52px',
  height: '52px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.12)',
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
  flexShrink: 0,
};

const returnButtonStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s',
  flexShrink: 0,
};

const liveBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#f87171',
};

const liveDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#ef4444',
  animation: 'pip-pulse 1.5s ease-in-out infinite',
};

function stationInitials(name: string): string {
  return name
    .split(/[\s\-_]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Inline SVG paths for play, pause, and return icons
const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
  </svg>
);

const ReturnIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 14l-4-4 4-4" />
    <path d="M5 10h11a4 4 0 0 1 0 8h-1" />
  </svg>
);

/**
 * Compact theater composition rendered inside the Document PiP window.
 * Uses inline styles exclusively since the PiP window has no Tailwind.
 */
export default function PiPTheaterFrame({
  station,
  track,
  isPlaying,
  onTogglePlay,
  onReturn,
}: PiPTheaterFrameProps) {
  const artworkUrl = track?.artworkUrl || station?.favicon;
  const displayTitle = track?.title || station?.name || 'Pulse Radio';
  const displaySubtitle = track?.artist || '';

  return (
    <div style={containerStyle}>
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pip-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={glassCardStyle}>
        {/* Station name label */}
        {station && <div style={stationNameStyle}>{station.name}</div>}

        {/* Album artwork */}
        {artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl}
            alt=""
            style={artworkStyle}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div style={artworkFallbackStyle}>{station ? stationInitials(station.name) : '♪'}</div>
        )}

        {/* Track title */}
        <div style={titleStyle}>{displayTitle}</div>

        {/* Artist */}
        {displaySubtitle && <div style={subtitleStyle}>{displaySubtitle}</div>}

        {/* LIVE badge */}
        {isPlaying && (
          <div style={liveBadgeStyle}>
            <span style={liveDotStyle} />
            LIVE
          </div>
        )}

        {/* Controls */}
        <div style={buttonRowStyle}>
          <button
            onClick={onReturn}
            style={returnButtonStyle}
            aria-label="Return to Pulse Radio"
            title="Return to Pulse Radio"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
            }}
          >
            <ReturnIcon />
          </button>

          <button
            onClick={onTogglePlay}
            style={playButtonStyle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
