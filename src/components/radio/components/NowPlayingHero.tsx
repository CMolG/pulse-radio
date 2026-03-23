/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useState } from "react";
import { Radio, Maximize2 } from "lucide-react";
import type { Station, NowPlayingTrack } from "../types";
import AnimatedBars from "./AnimatedBars";
import UiImage from "@/components/common/UiImage";
import {
  ParallaxAlbumBackground,
} from "@/lib/audio-visualizer";

function stationInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  station: Station;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  artworkUrl?: string | null;
  icyBitrate?: string | null;
  onTheater?: () => void;
};

export default function NowPlayingHero({
  station,
  track,
  isPlaying,
  artworkUrl,
  icyBitrate,
  onTheater,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const coverUrl = artworkUrl ?? station.favicon;
  const showFallback = !coverUrl || imgError;

  // Reset error state when image URL changes
  const lastCoverRef = React.useRef(coverUrl);
  React.useEffect(() => {
    if (coverUrl !== lastCoverRef.current) {
      lastCoverRef.current = coverUrl;
      setImgError(false);
    }
  }, [coverUrl]);

  return (
    <div className="relative flex flex-col px-5 py-4 bg-surface-1 bdr-b overflow-hidden">
      <ParallaxAlbumBackground
        imageUrl={artworkUrl ?? null}
        fallbackUrl={station.favicon || undefined}
        overlayClass="bg-black/60"
      />

      {onTheater && (
        <button
          onClick={onTheater}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-medium text-white/60 hover:text-white hover:bg-black/60 transition-all"
          title="Theater mode"
        >
          <Maximize2 size={12} />
          Theater
        </button>
      )}

      <div className="relative z-10 flex-row-4 w-full">
        <div className="relative w-16 h-16 rounded-xl bg-surface-2 flex-center-row shrink-0 overflow-hidden">
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {stationInitials(station.name) || (
                  <Radio size={24} className="text-white/60" />
                )}
              </span>
            </div>
          ) : (
            <UiImage
              src={coverUrl}
              alt=""
              className="object-cover"
              sizes="64px"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="flex-fill pr-20">
          <h3 className="text-[15px] font-semibold text-white truncate">
            {station.name}
          </h3>
          {track?.title ? (
            <p className="text-[13px] text-secondary truncate mt-0.5">
              {track.artist ? `${track.artist} — ${track.title}` : track.title}
            </p>
          ) : (
            <p className="text-[12px] text-secondary truncate mt-0.5">
              {station.tags?.split(",").slice(0, 3).join(" · ") ||
                "Internet Radio"}
            </p>
          )}
          {track?.album && (
            <p className="text-[11px] text-dim truncate">{track.album}</p>
          )}
          {isPlaying && (
            <div className="flex-row-1.5 mt-1">
              <span className="dot-1.5 bg-sys-orange" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-sys-orange">
                LIVE
              </span>
              <AnimatedBars size="small" />
              {icyBitrate && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/50 ml-1">
                  {icyBitrate}kbps
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
