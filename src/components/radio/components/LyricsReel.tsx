'use client';
/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import type { LyricsData } from '../types';

/* ── Types ── */
type RenderableLyricLine = { id: string; text: string };

type LyricsReelProps = {
  lyrics: LyricsData | null;
  currentTime?: number;
  activeLineOverride?: number;
  syncConfidence?: number;
  syncMode?: string;
  variant?: 'mobile' | 'desktop';
};

/* ── Constants ── */
const _NEWLINE_RE = /\r?\n/;
const _EVT_PASSIVE: AddEventListenerOptions = { passive: true };

const EMPHASIS: [string, string, string][] = [
  ['text-white font-bold opacity-100 scale-100', 'text-[22px]', 'text-[28px]'],
  ['text-white/82 font-semibold opacity-100 scale-[0.985]', 'text-[18px]', 'text-[23px]'],
  ['text-white/50 font-medium opacity-100 scale-95', 'text-[15px]', 'text-[19px]'],
  ['text-white/35 font-medium opacity-100 scale-[0.92]', 'text-[13px]', 'text-[17px]'],
  ['text-white/30 font-medium opacity-100 scale-[0.88]', 'text-[12px]', 'text-[16px]'],
];

const _LYRICS_MASK_STYLE: React.CSSProperties = {
  WebkitMaskImage:
    'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
  maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
};

/* ── Helpers ── */
function getActiveLyricIndex(lyrics: LyricsData | null, currentTime?: number) {
  if (currentTime == null || !lyrics?.synced || !lyrics.lines.length) return -1;
  const lines = lyrics.lines;
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return result;
}

function getEffectiveActiveLyricIndex(
  lyrics: LyricsData | null,
  currentTime: number | undefined,
  activeLineOverride?: number,
) {
  if (typeof activeLineOverride === 'number' && activeLineOverride >= 0) {
    if (!lyrics?.synced || !lyrics.lines.length) return -1;
    return Math.min(activeLineOverride, lyrics.lines.length - 1);
  }
  return getActiveLyricIndex(lyrics, currentTime);
}

function getRenderableLyricLines(lyrics: LyricsData | null): RenderableLyricLine[] {
  if (!lyrics) return [];
  if (lyrics.synced && lyrics.lines.length > 0) {
    return lyrics.lines.map((line, index) => ({
      id: `synced-${index}-${line.time}`,
      text: line.text || '♪',
    }));
  }
  if (!lyrics.plainText) return [];
  const raw = lyrics.plainText.split(_NEWLINE_RE);
  const result: RenderableLyricLine[] = [];
  for (let i = 0; i < raw.length; i++) {
    const text = raw[i].trim();
    if (text) result.push({ id: `plain-${result.length}`, text });
  }
  return result;
}

/* ── Memoized line component ── */
const LyricReelLine = React.memo(
  function LyricReelLine({
    lineId,
    index,
    text,
    emphasisIdx,
    isDesktop,
    lineRefs,
    scrollToIndex,
  }: {
    lineId: string;
    index: number;
    text: string;
    emphasisIdx: number;
    isDesktop: boolean;
    lineRefs: React.MutableRefObject<(HTMLElement | null)[]>;
    scrollToIndex: (i: number) => void;
  }) {
    const emphasisClass = `${EMPHASIS[emphasisIdx][0]} ${EMPHASIS[emphasisIdx][isDesktop ? 2 : 1]}`;
    return (
      <button
        key={lineId}
        ref={(node) => {
          // eslint-disable-next-line react-hooks/immutability
          lineRefs.current[index] = node;
        }}
        type="button"
        onClick={() => scrollToIndex(index)}
        className={`block w-full snap-center px-2 py-2 text-center leading-snug tracking-tight transition-all duration-300 ${emphasisClass}`}
      >
        <span
          className={`mx-auto block whitespace-pre-wrap ${isDesktop ? 'max-w-3xl' : 'max-w-[92%]'}`}
        >
          {text}
        </span>
      </button>
    );
  },
  (prev, next) =>
    prev.lineId === next.lineId &&
    prev.text === next.text &&
    prev.emphasisIdx === next.emphasisIdx &&
    prev.isDesktop === next.isDesktop,
);

/* ── Main component ── */
function LyricsReel({
  lyrics,
  currentTime,
  activeLineOverride,
  variant = 'mobile',
}: LyricsReelProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const userScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isDesktop = variant === 'desktop';
  const renderableLines = useMemo(() => getRenderableLyricLines(lyrics), [lyrics]);
  const activeIdx = useMemo(
    () => getEffectiveActiveLyricIndex(lyrics, currentTime, activeLineOverride),
    [activeLineOverride, currentTime, lyrics],
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    const line = lineRefs.current[index];
    if (!scroller || !line) return;
    const top = line.offsetTop - scroller.clientHeight / 2 + line.clientHeight / 2;
    scroller.scrollTo({ top: Math.max(0, top), behavior });
  }, []);

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
    lineRefs.current.length = renderableLines.length;
  }, [renderableLines.length]);

  useEffect(() => {
    if (!renderableLines.length) return;
    const frame = requestAnimationFrame(() => {
      scrollToIndex(0, 'auto');
      setFocusedIdx(0);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderableLines.length]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !renderableLines.length) return;
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFocusedIdx);
    };
    frame = requestAnimationFrame(updateFocusedIdx);
    scroller.addEventListener('scroll', handleScroll, _EVT_PASSIVE);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, [renderableLines.length, updateFocusedIdx]);

  // Auto-scroll when sync is enabled
  useEffect(() => {
    if (!syncEnabled || activeIdx < 0) return;
    scrollToIndex(activeIdx, 'smooth');
  }, [syncEnabled, activeIdx, scrollToIndex]);

  // Detect user scroll to temporarily pause sync auto-scroll
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !syncEnabled) return;
    const onWheel = () => {
      userScrolling.current = true;
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        userScrolling.current = false;
      }, 3000);
    };
    const onTouch = () => {
      userScrolling.current = true;
      clearTimeout(scrollTimeout.current);
    };
    const onTouchEnd = () => {
      scrollTimeout.current = setTimeout(() => {
        userScrolling.current = false;
      }, 3000);
    };
    scroller.addEventListener('wheel', onWheel, _EVT_PASSIVE);
    scroller.addEventListener('touchstart', onTouch, _EVT_PASSIVE);
    scroller.addEventListener('touchend', onTouchEnd, _EVT_PASSIVE);
    return () => {
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', onTouch);
      scroller.removeEventListener('touchend', onTouchEnd);
      clearTimeout(scrollTimeout.current);
    };
  }, [syncEnabled]);

  const emphasisSource = syncEnabled ? activeIdx : focusedIdx;
  if (renderableLines.length === 0) return null;

  return (
    <div className={`relative flex-shrink-0 ${isDesktop ? 'h-[256px] lg:h-[272px]' : 'h-[192px]'}`}>
      {/* Sync toggle button */}
      <span
        onClick={() => setSyncEnabled((s) => !s)}
        className={`absolute bottom-2 z-30 text-[10px] font-medium cursor-pointer transition-colors select-none ${isDesktop ? 'right-10' : 'right-7'} ${syncEnabled ? 'text-sys-orange' : 'text-white/30 hover:text-white/50'}`}
        title={syncEnabled ? 'Disable lyrics sync' : 'Enable lyrics sync'}
        role="button"
        tabIndex={0}
        aria-label={syncEnabled ? 'Disable lyrics sync' : 'Enable lyrics sync'}
        aria-pressed={syncEnabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSyncEnabled((s) => !s);
          }
        }}
      >
        Sync {syncEnabled ? 'ON' : 'OFF'}
      </span>
      <div
        className={`relative z-20 flex h-full flex-col ${isDesktop ? 'px-8 pb-5 pt-3' : 'px-5 pb-4 pt-2'}`}
      >
        <div
          ref={scrollerRef}
          className={`lyrics-reel custom-scrollbar h-full overflow-y-auto snap-y snap-mandatory ${isDesktop ? 'px-4' : 'px-2'}`}
          style={_LYRICS_MASK_STYLE}
          role="region"
          aria-label="Song lyrics"
        >
          <div className="flex min-h-full flex-col justify-center py-14">
            {renderableLines.map((line, index) => {
              const ei =
                activeIdx >= 0 && index === activeIdx
                  ? 0
                  : Math.min(Math.abs(index - emphasisSource), 3) + 1;
              return (
                <LyricReelLine
                  key={line.id}
                  lineId={line.id}
                  index={index}
                  text={line.text}
                  emphasisIdx={ei}
                  isDesktop={isDesktop}
                  lineRefs={lineRefs}
                  scrollToIndex={scrollToIndex}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LyricsReel);
