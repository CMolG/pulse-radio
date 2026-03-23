/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LyricsData } from "../types";
import {
  getEffectiveActiveLyricIndex,
  getRenderableLyricLines,
} from "../lyricsUtils";

type Props = {
  lyrics: LyricsData | null;
  loading: boolean;
  currentTime?: number;
   activeLineOverride?: number;
   syncConfidence?: number;
   syncMode?: "time" | "realtime";
  variant?: "mobile" | "desktop";
};

export default function LyricsReel({
  lyrics,
  loading,
  currentTime,
  activeLineOverride,
  variant = "mobile",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const isDesktop = variant === "desktop";

  const renderableLines = useMemo(
    () => getRenderableLyricLines(lyrics),
    [lyrics],
  );
  const activeIdx = useMemo(
    () => getEffectiveActiveLyricIndex(lyrics, currentTime, activeLineOverride),
    [activeLineOverride, currentTime, lyrics],
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      const line = lineRefs.current[index];
      if (!scroller || !line) return;

      const top =
        line.offsetTop - scroller.clientHeight / 2 + line.clientHeight / 2;

      scroller.scrollTo({
        top: Math.max(0, top),
        behavior,
      });
    },
    [],
  );

  const updateFocusedIdx = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !renderableLines.length) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const centerY = scrollerRect.top + scrollerRect.height / 2;
    let closestIdx = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    lineRefs.current.forEach((line, index) => {
      if (!line) return;

      const rect = line.getBoundingClientRect();
      const lineCenter = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - lineCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIdx = index;
      }
    });

    setFocusedIdx((prev) => (prev === closestIdx ? prev : closestIdx));
  }, [renderableLines.length]);

  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, renderableLines.length);
  }, [renderableLines.length]);

  useEffect(() => {
    if (!renderableLines.length) {
      const frame = requestAnimationFrame(() => {
        setFocusedIdx(0);
      });

      return () => cancelAnimationFrame(frame);
    }

    const targetIdx = activeIdx >= 0
      ? Math.min(activeIdx, renderableLines.length - 1)
      : 0;

    const frame = requestAnimationFrame(() => {
      setFocusedIdx((prev) => (prev === targetIdx ? prev : targetIdx));
      scrollToIndex(targetIdx, activeIdx >= 0 ? "smooth" : "auto");
    });

    return () => cancelAnimationFrame(frame);
  }, [activeIdx, renderableLines.length, scrollToIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !renderableLines.length) return;

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFocusedIdx);
    };

    frame = requestAnimationFrame(updateFocusedIdx);
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [renderableLines.length, updateFocusedIdx]);

  if (renderableLines.length === 0) return null;

  return (
    <div
      className={`relative flex-shrink-0 ${
        isDesktop ? "h-[256px] lg:h-[272px]" : "h-[192px]"
      }`}
    >
      <div
        className={`relative z-20 flex h-full flex-col ${
          isDesktop ? "px-8 pb-5 pt-3" : "px-5 pb-4 pt-2"
        }`}
      >
        <div
          ref={scrollerRef}
          className={`lyrics-reel custom-scrollbar h-full overflow-y-auto snap-y snap-mandatory ${
            isDesktop ? "px-4" : "px-2"
          }`}
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          }}
        >
          {renderableLines.length === 0 ? null : (
            <div className="flex min-h-full flex-col justify-center py-14">
              {renderableLines.map((line, index) => {
                const distanceFromFocus = Math.abs(index - focusedIdx);
                const isActive = activeIdx >= 0 && index === activeIdx;
                const emphasisClass = isActive
                  ? isDesktop
                    ? "text-white text-[28px] font-bold opacity-100 scale-100"
                    : "text-white text-[22px] font-bold opacity-100 scale-100"
                  : distanceFromFocus === 0
                    ? isDesktop
                      ? "text-white/82 text-[23px] font-semibold opacity-100 scale-[0.985]"
                      : "text-white/82 text-[18px] font-semibold opacity-100 scale-[0.985]"
                    : distanceFromFocus === 1
                      ? isDesktop
                        ? "text-white/50 text-[19px] font-medium opacity-100 scale-95"
                        : "text-white/50 text-[15px] font-medium opacity-100 scale-95"
                      : distanceFromFocus === 2
                        ? isDesktop
                          ? "text-white/26 text-[17px] font-medium opacity-100 scale-[0.92]"
                          : "text-white/26 text-[13px] font-medium opacity-100 scale-[0.92]"
                        : isDesktop
                          ? "text-white/14 text-[16px] font-medium opacity-100 scale-[0.88]"
                          : "text-white/14 text-[12px] font-medium opacity-100 scale-[0.88]";

                return (
                  <button
                    key={line.id}
                    ref={(node) => {
                      lineRefs.current[index] = node;
                    }}
                    type="button"
                    onClick={() => scrollToIndex(index)}
                    className={`block w-full snap-center px-2 py-2 text-center leading-snug tracking-tight transition-all duration-300 ${emphasisClass}`}
                  >
                    <span
                      className={`mx-auto block whitespace-pre-wrap ${
                        isDesktop ? "max-w-3xl" : "max-w-[92%]"
                      }`}
                    >
                      {line.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
