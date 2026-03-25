/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LyricsData } from "../types";
import { getEffectiveActiveLyricIndex, getRenderableLyricLines } from "../lyricsUtils";

type Props = {
  lyrics: LyricsData | null;
  currentTime?: number;
   activeLineOverride?: number;
  variant?: "mobile" | "desktop";
};

// [base classes, mobile size, desktop size]
const EMPHASIS: [string, string, string][] = [
  ["text-white font-bold opacity-100 scale-100", "text-[22px]", "text-[28px]"],
  ["text-white/82 font-semibold opacity-100 scale-[0.985]", "text-[18px]", "text-[23px]"],
  ["text-white/50 font-medium opacity-100 scale-95", "text-[15px]", "text-[19px]"],
  ["text-white/26 font-medium opacity-100 scale-[0.92]", "text-[13px]", "text-[17px]"],
  ["text-white/14 font-medium opacity-100 scale-[0.88]", "text-[12px]", "text-[16px]"],
];

const LyricReelLine = React.memo(function LyricReelLine({
  lineId, index, text, emphasisIdx, isDesktop, lineRefs, scrollToIndex,
}: {
  lineId: string; index: number; text: string; emphasisIdx: number;
  isDesktop: boolean; lineRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  scrollToIndex: (i: number) => void;
}) {
  const emphasisClass = `${EMPHASIS[emphasisIdx][0]} ${EMPHASIS[emphasisIdx][isDesktop ? 2 : 1]}`;
  return (
    <button
      key={lineId}
      ref={(node) => { lineRefs.current[index] = node; }}
      type="button"
      onClick={() => scrollToIndex(index)}
      className={`block w-full snap-center px-2 py-2 text-center leading-snug tracking-tight transition-all duration-300 ${emphasisClass}`}
    >
      <span className={`mx-auto block whitespace-pre-wrap ${isDesktop ? "max-w-3xl" : "max-w-[92%]"}`}>{text}</span>
    </button>
  );
}, (prev, next) =>
  prev.lineId === next.lineId &&
  prev.text === next.text &&
  prev.emphasisIdx === next.emphasisIdx &&
  prev.isDesktop === next.isDesktop
);

export default function LyricsReel({ lyrics, currentTime, activeLineOverride, variant = "mobile", }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const isDesktop = variant === "desktop";
  const renderableLines = useMemo(() => getRenderableLyricLines(lyrics), [lyrics]);
  const activeIdx = useMemo( () => getEffectiveActiveLyricIndex(lyrics, currentTime, activeLineOverride),
    [activeLineOverride, currentTime, lyrics],
  );
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current; const line = lineRefs.current[index]; if (!scroller || !line) return;
      const top = line.offsetTop - scroller.clientHeight / 2 + line.clientHeight / 2;
      scroller.scrollTo({ top: Math.max(0, top), behavior, });
    },
    [],
  );
  const updateFocusedIdx = useCallback(() => {
    const scroller = scrollerRef.current; if (!scroller || !renderableLines.length) return;
    const scrollerRect = scroller.getBoundingClientRect(); const centerY = scrollerRect.top + scrollerRect.height / 2;
    let closestIdx = 0; let closestDistance = Number.POSITIVE_INFINITY;
    lineRefs.current.forEach((line, index) => {
      if (!line) return;
      const rect = line.getBoundingClientRect(); const lineCenter = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - lineCenter);
      if (distance < closestDistance) { closestDistance = distance; closestIdx = index; }
    });
    setFocusedIdx((prev) => (prev === closestIdx ? prev : closestIdx));
  }, [renderableLines.length]);
  useEffect(() => { lineRefs.current = lineRefs.current.slice(0, renderableLines.length); }, [renderableLines.length]);
  // Reset scroll position when lyrics change (no autoscroll on active line —
  // user controls focus manually by scrolling or clicking a line)
  useEffect(() => {
    if (!renderableLines.length) return;
    const frame = requestAnimationFrame(() => { scrollToIndex(0, "auto"); setFocusedIdx(0); });
    return () => cancelAnimationFrame(frame);
  // Only react to lyrics changing, not to activeIdx
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderableLines.length]);
  useEffect(() => {
    const scroller = scrollerRef.current; if (!scroller || !renderableLines.length) return;
    let frame = 0;
    const handleScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(updateFocusedIdx); };
    frame = requestAnimationFrame(updateFocusedIdx);
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); scroller.removeEventListener("scroll", handleScroll); };
  }, [renderableLines.length, updateFocusedIdx]);
  if (renderableLines.length === 0) return null;
  return (
    <div className={`relative flex-shrink-0 ${isDesktop ? "h-[256px] lg:h-[272px]" : "h-[192px]"}`}>
      <div className={`relative z-20 flex h-full flex-col ${isDesktop ? "px-8 pb-5 pt-3" : "px-5 pb-4 pt-2"}`}>
        <div
          ref={scrollerRef}
          className={`lyrics-reel custom-scrollbar h-full overflow-y-auto snap-y snap-mandatory ${
            isDesktop ? "px-4" : "px-2"
          }`}
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          }}>
            <div className="flex min-h-full flex-col justify-center py-14">
              {renderableLines.map((line, index) => {
                const ei = (activeIdx >= 0 && index === activeIdx) ? 0 : Math.min(Math.abs(index - focusedIdx), 3) + 1;
                return (
                  <LyricReelLine
                    key={line.id}
                    lineId={line.id}
                    index={index}
                    text={line.text}
                    emphasisIdx={ei}
                    isDesktop={isDesktop}
                    lineRefs={lineRefs}
                    scrollToIndex={scrollToIndex} />
                );
              })}</div></div></div></div>
  );
}
