/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Radio, Star, Heart, ExternalLink, Clock } from "lucide-react";
import { motion } from "motion/react";
import type { Station, NowPlayingTrack, LyricsData } from "../types";
import AnimatedBars from "./AnimatedBars";
import LyricsReel from "./MobileLyricsReel";
import { SpiralRenderer } from "@/lib/audio-visualizer/SpiralRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import { formatDuration, formatReleaseDate } from "../utils/formatDuration";
import { stationInitials } from "../utils/formatUtils";
import UiImage from "@/components/common/UiImage";
// Fallback spiral colors — warm orange/red gradient
const FALLBACK_COLORS: [string, string, string] = ["#ff4b1f", "#ff9068", "#f9d423"];
const Badge = ({ mono, upper, children }: { mono?: boolean; upper?: boolean; children: React.ReactNode }) => (
  <span className={`px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/50${mono ? " font-mono" : ""}${upper ? " uppercase" : ""}`}>{children}</span>
);
type Props = { station: Station; track: NowPlayingTrack | null;
  isPlaying: boolean; frequencyDataRef?: React.RefObject<Uint8Array | null>;
  artworkUrl?: string | null; icyBitrate?: string | null; onBack: () => void; onToggleFav?: () => void;
  isFavorite?: boolean; onFavSong?: () => void; isSongLiked?: boolean; lyrics?: LyricsData | null;
  currentTime?: number; activeLineOverride?: number; lyricsVariant?: "mobile" | "desktop"; compact?: boolean; };
const _colorCache = new Map<string, Promise<[string, string, string]>>();
const MAX_COLOR_CACHE = 32;
/** Extract the top-2 saturated hues from an artwork image for use as spiral colors. */
function extractColors(imgUrl: string): Promise<[string, string, string]> {
  const cached = _colorCache.get(imgUrl); if (cached) return cached;
  const p = new Promise<[string, string, string]>((resolve) => { const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { try {
        const canvas = document.createElement("canvas"); const size = 48; canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d"); if (!ctx) return resolve(FALLBACK_COLORS);
        ctx.drawImage(img, 0, 0, size, size); const data = ctx.getImageData(0, 0, size, size).data;
        const buckets: Record<number, number> = {};
        for (let i = 0; i < data.length; i += 12) {
          const r = data[i], g = data[i + 1], b = data[i + 2]; const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max - min < 25) continue; const s = (max - min) / max; if (s < 0.2) continue; let h = 0;
          if (max === r) h = 60 * (((g - b) / (max - min)) % 6);
          else if (max === g) h = 60 * ((b - r) / (max - min) + 2); else h = 60 * ((r - g) / (max - min) + 4);
          if (h < 0) h += 360; const bucket = Math.round(h / 30) * 30; buckets[bucket] = (buckets[bucket] || 0) + 1; }
        const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
        if (sorted.length < 1) return resolve(FALLBACK_COLORS);
        const h1 = parseInt(sorted[0][0]); const h2 = sorted.length > 1 ? parseInt(sorted[1][0]) : (h1 + 120) % 360;
        const h3 = sorted.length > 2 ? parseInt(sorted[2][0]) : (h1 + 240) % 360;
        resolve([ `hsl(${h1}, 75%, 55%)`, `hsl(${h2}, 65%, 50%)`, `hsl(${h3}, 60%, 45%)`, ]);
      } catch { resolve(FALLBACK_COLORS); }
    }; img.onerror = () => resolve(FALLBACK_COLORS); img.src = imgUrl;});
  if (_colorCache.size >= MAX_COLOR_CACHE) {
    const first = _colorCache.keys().next().value; if (first !== undefined) _colorCache.delete(first); }
  _colorCache.set(imgUrl, p); return p; }
export default function TheaterView({
  station, track, isPlaying, frequencyDataRef, artworkUrl, icyBitrate, onBack, onToggleFav,
  isFavorite, onFavSong, isSongLiked, lyrics, currentTime, activeLineOverride, lyricsVariant = "mobile", compact,
}: Props) { const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<[string, string, string]>(FALLBACK_COLORS);
  const lastUrlRef = useRef<string | null>(null); const coverUrl = artworkUrl ?? station.favicon;
  const showFallback = !coverUrl || failedCoverUrl === coverUrl;
  useEffect(() => { if (!artworkUrl || artworkUrl === lastUrlRef.current) return; lastUrlRef.current = artworkUrl;
    let cancelled = false; extractColors(artworkUrl).then(c => { if (!cancelled) setColors(c); });
    return () => { cancelled = true; };
  }, [artworkUrl]); const [color1, color2, color3] = colors;
  const theaterTags = useMemo( () => station.tags?.split(",").slice(0, 3).join(" · ") ?? "Internet Radio",
    [station.tags],);
  return ( <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full w-full relative overflow-hidden"> {/* ── Layer 1: solid dark background ── */}
      <div className="absolute inset-0 bg-[#0f172a]" /> {/* ── Layer 1.5: album art background with ambient drift ── */}
      {coverUrl && failedCoverUrl !== coverUrl && (
        <div className="absolute inset-0 z-2 pointer-events-none overflow-hidden"><UiImage
            src={coverUrl}
            alt=""
            className="object-cover animate-ambient-drift blur-lg opacity-25"
            sizes="100vw"
            onError={() => setFailedCoverUrl(coverUrl)} />
          <div className="absolute inset-0 bg-linear-to-t from-[#0f172a] via-[#0f172a]/40 to-[#0f172a]/60" /></div>
      )}
      {/* ── Layer 2: Fibonacci/logarithmic spiral visualizer (blurred, fills screen) ── */}
      <div className="absolute inset-0 z-5 pointer-events-none"><ErrorBoundary fallback={null}><SpiralRenderer
          frequencyDataRef={frequencyDataRef}
          className="size-full"
          color1={color1}
          color2={color2}
          color3={color3}
          sensitivity={compact ? 0.8 : 1.2}
          demo /></ErrorBoundary></div>
      {/* ── Layer 3: CRT scanlines + vignette overlay ── */} <div
        className="absolute inset-0 z-6 pointer-events-none"
        style={{
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%', mixBlendMode: 'overlay', opacity: 0.6, }} />
      <div
        className="absolute inset-0 z-6 pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9)', }} />
      <div
        className="absolute inset-0 z-6 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 40%)', }} />
      {/* ── Top controls (back + favorites) — offset by safe-area-inset-top ── */}
      {!compact && ( <div
          className="absolute left-0 right-0 z-20 flex items-start justify-between px-4 pt-4"
          style={{ top: "env(safe-area-inset-top, 0px)" }}><button
            onClick={onBack}
            className="flex-row-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-soft hover:text-white hover:bg-black/50 transition-all text-[13px]"
            aria-label="Exit theater mode"><ArrowLeft size={16} /></button>
          <div className="flex flex-row gap-2 sm:flex-col">{onToggleFav && ( <button
                onClick={onToggleFav}
                className={`p-2 rounded-full backdrop-blur-md border transition-all ${isFavorite ? "bg-sys-orange/20 border-sys-orange/40 text-sys-orange" : "bg-black/30 border-white/10 text-soft hover:text-white hover:bg-black/50"}`}
                aria-label="Favorite station"
                aria-pressed={!!isFavorite}><Star size={16} className={isFavorite ? "fill-sys-orange" : ""} /></button>
            )}
            {onFavSong && track && ( <button
                onClick={onFavSong}
                className={`p-2 rounded-full backdrop-blur-md border transition-all ${isSongLiked ? "bg-pink-500/20 border-pink-400/40 text-pink-400" : "bg-black/30 border-white/10 text-soft hover:text-pink-400 hover:bg-black/50"}`}
                aria-label="Favorite song"
                aria-pressed={!!isSongLiked}><Heart size={16} className={isSongLiked ? "fill-pink-400" : ""} /></button>
            )}</div></div>
      )}
      {/* ── Layer 4: content — glassmorphism panel centered over the spiral ── */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4"><div
          className={`flex flex-col items-center ${compact ? "gap-2 px-4 py-3" : "gap-3 px-6 py-5"} rounded-3xl max-w-sm w-full`}
          style={{ background: "rgba(0, 0, 0, 0.35)", backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: `0 8px 48px rgba(0,0,0,0.6), 0 0 80px ${color1}25`,
          }}> {/* Corner metadata badges (panel corners, never over album art) */}
          {!compact && ( <div className="w-full grid grid-cols-2 items-start"><div className="justify-self-start">
                {track?.durationMs && (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/80 inline-flex items-center gap-1">
                    <Clock size={10} />
                    {formatDuration(track.durationMs)}</span>)}</div><div className="justify-self-end">
                {track?.trackNumber != null && track?.trackCount != null && (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/80">
                    #{track.trackNumber}/{track.trackCount}</span>)}</div></div>
          )}
          {/* Cover art */} <div
            className={`${compact ? "w-14 h-14 rounded-xl" : "w-36 h-36 sm:w-44 sm:h-44 rounded-2xl"} relative overflow-hidden flex-center-row flex-shrink-0`}
            style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 48px ${color1}50`, }}> {showFallback ? (
              <div className="size-full dawn-gradient flex-center-row"><span
                  className={`${compact ? "text-base" : "text-4xl"} text-white/90 font-bold select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                >{stationInitials(station.name) || ( <Radio size={compact ? 24 : 52} className="text-white/60" />
                  )}</span></div>
            ) : ( <UiImage
                src={coverUrl}
                alt=""
                className="object-cover"
                sizes={compact ? "56px" : "176px"}
                loading="lazy"
                onError={() => setFailedCoverUrl(coverUrl)} />
            )}</div>
          {/* Station name */} <h2
            className={`${compact ? "text-[11px] mb-0" : "text-lg sm:text-xl mb-0"} font-bold text-white text-center drop-shadow-lg line-clamp-2 leading-tight`}
          >{station.name}</h2> {/* Track info */}
          {track?.title ? ( <p
              className={`${compact ? "text-[9px]" : "text-[13px] sm:text-[14px]"} text-white/70 text-center line-clamp-2 leading-snug`}
            >{track.artist ? `${track.artist} — ${track.title}` : track.title}</p>
          ) : ( <p className={`${compact ? "text-[8px]" : "text-[12px]"} text-white/40 text-center`}>{theaterTags}</p>
          )}
          {track?.album && (
            <p className={`${compact ? "text-[8px]" : "text-[11px]"} text-white/40 text-center line-clamp-1`}>
              {track.album}</p>
          )}
          {!compact && track?.releaseDate && ( <p className="text-[10px] text-white/40 text-center -mt-1">
              Released on: {formatReleaseDate(track.releaseDate)}</p>
          )}
          {/* LIVE badge */}
          {isPlaying && ( <div className={`flex-row-2 ${compact ? "mt-0" : "mt-1"}`}>
              <span className={`${compact ? "dot-1.5" : "dot-2"} bg-red-500 animate-pulse`} /> <span
                className={`${compact ? "text-[8px]" : "text-[11px]"} font-semibold tracking-wider uppercase text-red-400`}
              >LIVE</span>{!compact && <AnimatedBars size="small" />}</div>
          )}
          {/* Station details badges */}
          {!compact && ( <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {station.codec && <Badge mono upper>{station.codec}</Badge>}
              {(icyBitrate || station.bitrate > 0) && <Badge mono>{icyBitrate ?? station.bitrate}kbps</Badge>}
              {station.country && <Badge>{station.country}</Badge>}
              {track?.genre && <Badge>{track.genre}</Badge>}</div>
          )}
          {/* Listen on Apple Music */}
          {!compact && track && ( <a
              href={track.itunesUrl || `https://music.apple.com/search?term=${encodeURIComponent(`${track.artist} ${track.title}`.trim())}&pt=pulse-radio&ct=www.pulse-radio.online`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white/60 hover:text-white/80 transition-colors"
            ><ExternalLink size={11} />
              Listen on Apple Music</a>
          )}
          {/* ── Lyrics reel inside glass panel ── */}
          {!compact && (
            <div className={`w-full ${lyricsVariant === "desktop" ? "px-2 pb-2" : "px-0 pb-1"}`}><LyricsReel
                lyrics={lyrics ?? null}
                currentTime={currentTime}
                activeLineOverride={activeLineOverride}
                variant={lyricsVariant} /></div>)}</div></div></motion.div>
  ); }
