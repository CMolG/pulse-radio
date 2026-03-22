/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Radio, Star, Heart, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import type { Station, NowPlayingTrack, LyricsData } from "../types";
import AnimatedBars from "./AnimatedBars";
import LyricsReel from "./MobileLyricsReel";
import { SpiralRenderer } from "@/lib/audio-visualizer/SpiralRenderer";

function stationInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Fallback spiral colors — warm orange/red gradient
const FALLBACK_COLORS: [string, string, string] = ["#ff4b1f", "#ff9068", "#f9d423"];

type Props = {
  station: Station;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  artworkUrl?: string | null;
  icyBitrate?: string | null;
  onBack: () => void;
  onToggleFav?: () => void;
  isFavorite?: boolean;
  onFavSong?: () => void;
  isSongLiked?: boolean;
  lyrics?: LyricsData | null;
  lyricsLoading?: boolean;
  currentTime?: number;
  lyricsVariant?: "mobile" | "desktop";
  compact?: boolean;
};

/** Extract the top-2 saturated hues from an artwork image for use as spiral colors. */
function extractColors(imgUrl: string): Promise<[string, string, string]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(FALLBACK_COLORS);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets: Record<number, number> = {};
        for (let i = 0; i < data.length; i += 12) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max - min < 25) continue;
          const s = (max - min) / max;
          if (s < 0.2) continue;
          let h = 0;
          if (max === r) h = 60 * (((g - b) / (max - min)) % 6);
          else if (max === g) h = 60 * ((b - r) / (max - min) + 2);
          else h = 60 * ((r - g) / (max - min) + 4);
          if (h < 0) h += 360;
          const bucket = Math.round(h / 30) * 30;
          buckets[bucket] = (buckets[bucket] || 0) + 1;
        }
        const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
        if (sorted.length < 1) return resolve(FALLBACK_COLORS);
        const h1 = parseInt(sorted[0][0]);
        const h2 = sorted.length > 1 ? parseInt(sorted[1][0]) : (h1 + 120) % 360;
        const h3 = sorted.length > 2 ? parseInt(sorted[2][0]) : (h1 + 240) % 360;
        resolve([
          `hsl(${h1}, 75%, 55%)`,
          `hsl(${h2}, 65%, 50%)`,
          `hsl(${h3}, 60%, 45%)`,
        ]);
      } catch {
        resolve(FALLBACK_COLORS);
      }
    };
    img.onerror = () => resolve(FALLBACK_COLORS);
    img.src = imgUrl;
  });
}

export default function TheaterView({
  station,
  track,
  isPlaying,
  frequencyDataRef,
  artworkUrl,
  icyBitrate,
  onBack,
  onToggleFav,
  isFavorite,
  onFavSong,
  isSongLiked,
  lyrics,
  lyricsLoading,
  currentTime,
  lyricsVariant = "mobile",
  compact,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const [colors, setColors] = useState<[string, string, string]>(FALLBACK_COLORS);
  const lastUrlRef = useRef<string | null>(null);

  const coverUrl = artworkUrl ?? station.favicon;
  const showFallback = !coverUrl || imgError;

  // Reset error state when image URL changes
  const lastCoverRef = useRef(coverUrl);
  if (coverUrl !== lastCoverRef.current) {
    lastCoverRef.current = coverUrl;
    if (imgError) setImgError(false);
  }

  useEffect(() => {
    if (!artworkUrl || artworkUrl === lastUrlRef.current) return;
    lastUrlRef.current = artworkUrl;
    extractColors(artworkUrl).then(setColors);
  }, [artworkUrl]);

  const [color1, color2, color3] = colors;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full w-full relative overflow-hidden"
    >
      {/* ── Layer 1: solid dark background ── */}
      <div className="absolute inset-0 bg-[#0f172a]" />

      {/* ── Layer 1.5: album art background with ambient drift ── */}
      {coverUrl && !imgError && (
        <div className="absolute inset-0 z-2 pointer-events-none overflow-hidden">
          <img
            src={coverUrl}
            alt=""
            className="size-full object-cover animate-ambient-drift blur-lg opacity-25"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0f172a] via-[#0f172a]/40 to-[#0f172a]/60" />
        </div>
      )}

      {/* ── Layer 2: Fibonacci/logarithmic spiral visualizer (blurred, fills screen) ── */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        <SpiralRenderer
          frequencyDataRef={frequencyDataRef}
          className="size-full"
          color1={color1}
          color2={color2}
          color3={color3}
          sensitivity={compact ? 0.8 : 1.2}
          demo
        />
      </div>

      {/* ── Layer 3: fractal noise overlay (mix-blend-mode overlay, same as reference HTML) ── */}
      <div
        className="absolute inset-0 z-6 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
          opacity: 0.15,
        }}
      />

      {/* ── Back button ── */}
      {!compact && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-20 flex-row-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-soft hover:text-white hover:bg-black/50 transition-all text-[13px]"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      {/* ── Favorite station button (top right) ── */}
      {!compact && onToggleFav && (
        <button
          onClick={onToggleFav}
          className={`absolute top-4 right-4 z-20 p-2 rounded-full backdrop-blur-md border transition-all ${isFavorite ? "bg-sys-orange/20 border-sys-orange/40 text-sys-orange" : "bg-black/30 border-white/10 text-soft hover:text-white hover:bg-black/50"}`}
          title="Favorite station"
        >
          <Star size={16} className={isFavorite ? "fill-sys-orange" : ""} />
        </button>
      )}

      {/* ── Favorite song button (top right, below star) ── */}
      {!compact && onFavSong && track && (
        <button
          onClick={onFavSong}
          className={`absolute ${onToggleFav ? "top-14" : "top-4"} right-4 z-20 p-2 rounded-full backdrop-blur-md border transition-all ${isSongLiked ? "bg-pink-500/20 border-pink-400/40 text-pink-400" : "bg-black/30 border-white/10 text-soft hover:text-pink-400 hover:bg-black/50"}`}
          title="Favorite song"
        >
          <Heart size={16} className={isSongLiked ? "fill-pink-400" : ""} />
        </button>
      )}

      {/* ── Layer 4: content — glassmorphism panel centered over the spiral ── */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div
          className={`flex flex-col items-center ${compact ? "gap-2 px-4 py-3" : "gap-4 px-8 py-8"} rounded-3xl max-w-sm w-full`}
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: `0 8px 48px rgba(0,0,0,0.6), 0 0 80px ${color1}25`,
          }}
        >
          {/* Cover art */}
          <div
            className={`${compact ? "w-14 h-14 rounded-xl" : "w-36 h-36 sm:w-44 sm:h-44 rounded-2xl"} overflow-hidden flex-center-row flex-shrink-0`}
            style={{
              boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 48px ${color1}50`,
            }}
          >
            {showFallback ? (
              <div className="size-full dawn-gradient flex-center-row">
                <span
                  className={`${compact ? "text-base" : "text-4xl"} text-white/90 font-bold select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                >
                  {stationInitials(station.name) || (
                    <Radio size={compact ? 24 : 52} className="text-white/60" />
                  )}
                </span>
              </div>
            ) : (
              <img
                src={coverUrl}
                alt=""
                className="size-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          {/* Station name */}
          <h2
            className={`${compact ? "text-[11px] mb-0" : "text-lg sm:text-xl mb-0"} font-bold text-white text-center drop-shadow-lg line-clamp-2 leading-tight`}
          >
            {station.name}
          </h2>

          {/* Track info */}
          {track?.title ? (
            <p
              className={`${compact ? "text-[9px]" : "text-[13px] sm:text-[14px]"} text-white/70 text-center line-clamp-2 leading-snug`}
            >
              {track.artist ? `${track.artist} — ${track.title}` : track.title}
            </p>
          ) : (
            <p
              className={`${compact ? "text-[8px]" : "text-[12px]"} text-white/40 text-center`}
            >
              {station.tags?.split(",").slice(0, 3).join(" · ") || "Internet Radio"}
            </p>
          )}

          {track?.album && (
            <p
              className={`${compact ? "text-[8px]" : "text-[11px]"} text-white/40 text-center line-clamp-1`}
            >
              {track.album}
            </p>
          )}

          {/* LIVE badge */}
          {isPlaying && (
            <div className={`flex-row-2 ${compact ? "mt-0" : "mt-1"}`}>
              <span className={`${compact ? "dot-1.5" : "dot-2"} bg-red-500 animate-pulse`} />
              <span
                className={`${compact ? "text-[8px]" : "text-[11px]"} font-semibold tracking-wider uppercase text-red-400`}
              >
                LIVE
              </span>
              {!compact && <AnimatedBars size="small" />}
            </div>
          )}

          {/* Station details badges */}
          {!compact && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {station.codec && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-white/50 uppercase">
                  {station.codec}
                </span>
              )}
              {(icyBitrate || station.bitrate > 0) && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-white/50">
                  {icyBitrate ?? station.bitrate}kbps
                </span>
              )}
              {station.country && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/50">
                  {station.country}
                </span>
              )}
            </div>
          )}

          {/* Listen on Apple Music */}
          {!compact && track && (
            <a
              href={track.itunesUrl || `https://music.apple.com/search?term=${encodeURIComponent(`${track.artist} ${track.title}`.trim())}&pt=pulse-radio&ct=www.pulse-radio.online`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white/60 hover:text-white/80 transition-colors"
            >
              <ExternalLink size={11} />
              Listen on Apple Music
            </a>
          )}
        </div>
      </div>

      {/* ── Lyrics reel in theater mode ── */}
      {!compact && (
        <div
          className={`relative z-10 ${
            lyricsVariant === "desktop" ? "px-6 pb-4" : "px-3 pb-3"
          }`}
        >
          <LyricsReel
            lyrics={lyrics ?? null}
            loading={Boolean(lyricsLoading)}
            currentTime={currentTime}
            artworkUrl={artworkUrl ?? null}
            fallbackUrl={station.favicon}
            variant={lyricsVariant}
          />
        </div>
      )}
    </motion.div>
  );
}
