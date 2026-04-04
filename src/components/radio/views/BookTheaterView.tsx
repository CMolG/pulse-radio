/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Minus,
  Plus,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import type { BookContentPage } from '@/logic/gutenberg-api';
import type { ReadingPreferences } from '../hooks/useBookReader';

/* ── Theme config ────────────────────────────────────────────────── */

const THEME_STYLES: Record<
  ReadingPreferences['theme'],
  { bg: string; text: string; pageBg: string }
> = {
  day: { bg: '#f5f5f5', text: '#1a1a1a', pageBg: '#ffffff' },
  sepia: { bg: '#e8dcc8', text: '#3b2f1e', pageBg: '#f4ecd8' },
  night: { bg: '#111122', text: '#d4d4e0', pageBg: '#1a1a2e' },
};

/* ── Types ────────────────────────────────────────────────────────── */

interface BookTheaterViewProps {
  pages: BookContentPage[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  bookTitle: string;
  preferences: ReadingPreferences;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSetPreferences: (prefs: Partial<ReadingPreferences>) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

/* ── Component ───────────────────────────────────────────────────── */

export default function BookTheaterView({
  pages,
  currentPage,
  totalPages,
  loading,
  error,
  bookTitle,
  preferences,
  onNextPage,
  onPrevPage,
  onSetPreferences,
  onClose,
}: BookTheaterViewProps) {
  const { t } = useLocale();
  const [showSettings, setShowSettings] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const theme = THEME_STYLES[preferences.theme];
  const leftPage = pages[currentPage] ?? null;
  const rightPage = !isMobile ? (pages[currentPage + 1] ?? null) : null;
  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  // Responsive check
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Page turn with animation
  const turn = useCallback(
    (dir: 'left' | 'right') => {
      if (isAnimating) return;
      setDirection(dir);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        if (dir === 'left') onNextPage();
        else onPrevPage();
        setIsAnimating(false);
        setDirection(null);
      }, 300);
      return () => clearTimeout(timer);
    },
    [isAnimating, onNextPage, onPrevPage],
  );

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        turn('left');
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        turn('right');
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, onClose]);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;

      if (dx < 0) turn('left');
      else turn('right');
    },
    [turn],
  );

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const flipStyle = (side: 'left' | 'right') => {
    if (reducedMotion || !isAnimating || !direction) return {};
    if (direction === 'left' && side === 'left') {
      return {
        transform: 'perspective(1200px) rotateY(-15deg)',
        transition: 'transform 0.3s ease-out',
      };
    }
    if (direction === 'right' && side === 'right') {
      return {
        transform: 'perspective(1200px) rotateY(15deg)',
        transition: 'transform 0.3s ease-out',
      };
    }
    return {};
  };

  // Render page content
  const renderPage = (page: BookContentPage | null, side: 'left' | 'right') => (
    <div
      className="flex-1 h-full rounded-xl overflow-y-auto p-6 sm:p-8 shadow-lg"
      style={{
        background: theme.pageBg,
        color: theme.text,
        fontSize: `${preferences.fontSize}px`,
        lineHeight: preferences.lineHeight,
        transformOrigin: side === 'left' ? 'right center' : 'left center',
        ...flipStyle(side),
      }}
    >
      {page ? (
        <>
          {page.chapterLabel && (
            <h2
              className="text-center font-bold mb-4 opacity-70"
              style={{ fontSize: `${preferences.fontSize + 4}px` }}
            >
              {page.chapterLabel}
            </h2>
          )}
          <div className="whitespace-pre-wrap">{page.text}</div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center opacity-20">
          <BookOpen size={48} />
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: theme.bg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-black/10 transition-colors"
          aria-label="Close reader"
        >
          <X size={20} style={{ color: theme.text }} />
        </button>
        <h1
          className="text-[14px] font-medium truncate max-w-[60%] text-center"
          style={{ color: theme.text }}
        >
          {bookTitle}
        </h1>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-black/10 transition-colors"
          aria-label={t('booksSettings')}
        >
          <Settings size={20} style={{ color: theme.text }} />
        </button>
      </header>

      {/* Settings panel (inline) */}
      {showSettings && (
        <div
          className="flex-shrink-0 mx-4 mb-3 p-4 rounded-2xl space-y-4"
          style={{
            background: 'rgba(128, 128, 128, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <h3 className="text-[13px] font-semibold" style={{ color: theme.text }}>
            {t('booksSettings')}
          </h3>

          {/* Font size */}
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: theme.text, opacity: 0.7 }}>
              {t('booksFontSize')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onSetPreferences({ fontSize: Math.max(12, preferences.fontSize - 2) })
                }
                className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-black/10 transition-colors"
                aria-label="Decrease font size"
              >
                <Minus size={16} style={{ color: theme.text }} />
              </button>
              <span className="text-[13px] w-8 text-center" style={{ color: theme.text }}>
                {preferences.fontSize}
              </span>
              <button
                onClick={() =>
                  onSetPreferences({ fontSize: Math.min(32, preferences.fontSize + 2) })
                }
                className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-black/10 transition-colors"
                aria-label="Increase font size"
              >
                <Plus size={16} style={{ color: theme.text }} />
              </button>
            </div>
          </div>

          {/* Line height */}
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: theme.text, opacity: 0.7 }}>
              {t('booksLineHeight')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onSetPreferences({
                    lineHeight: Math.max(1.2, +(preferences.lineHeight - 0.2).toFixed(1)),
                  })
                }
                className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-black/10 transition-colors"
                aria-label="Decrease line height"
              >
                <Minus size={16} style={{ color: theme.text }} />
              </button>
              <span className="text-[13px] w-8 text-center" style={{ color: theme.text }}>
                {preferences.lineHeight.toFixed(1)}
              </span>
              <button
                onClick={() =>
                  onSetPreferences({
                    lineHeight: Math.min(2.5, +(preferences.lineHeight + 0.2).toFixed(1)),
                  })
                }
                className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-black/10 transition-colors"
                aria-label="Increase line height"
              >
                <Plus size={16} style={{ color: theme.text }} />
              </button>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: theme.text, opacity: 0.7 }}>
              {t('booksTheme')}
            </span>
            <div className="flex gap-2">
              {(['day', 'sepia', 'night'] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => onSetPreferences({ theme: th })}
                  className={`px-3 py-2 rounded-xl text-[12px] font-medium min-h-[44px] min-w-[44px] transition-colors ${
                    preferences.theme === th ? 'ring-2 ring-blue-400/60' : ''
                  }`}
                  style={{
                    background: THEME_STYLES[th].pageBg,
                    color: THEME_STYLES[th].text,
                  }}
                >
                  {t(
                    th === 'day'
                      ? 'booksThemeDay'
                      : th === 'sepia'
                        ? 'booksThemeSepia'
                        : 'booksThemeNight',
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Book content area */}
      <div className="flex-1 min-h-0 flex items-stretch px-4 gap-4 pb-2">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: theme.text, opacity: 0.3 }}
            />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
            <BookOpen size={32} style={{ color: theme.text, opacity: 0.2 }} />
            <p className="text-[13px]" style={{ color: theme.text, opacity: 0.5 }}>
              {error}
            </p>
          </div>
        ) : (
          <>
            {/* Prev button */}
            <button
              onClick={() => turn('right')}
              disabled={currentPage <= 0}
              className="hidden sm:flex items-center justify-center w-11 flex-shrink-0 rounded-xl hover:bg-black/10 transition-colors disabled:opacity-20"
              aria-label="Previous page"
            >
              <ChevronLeft size={24} style={{ color: theme.text }} />
            </button>

            {/* Pages */}
            <div className="flex-1 flex gap-4 min-w-0">
              {renderPage(leftPage, 'left')}
              {!isMobile && renderPage(rightPage, 'right')}
            </div>

            {/* Next button */}
            <button
              onClick={() => turn('left')}
              disabled={currentPage >= totalPages - 1}
              className="hidden sm:flex items-center justify-center w-11 flex-shrink-0 rounded-xl hover:bg-black/10 transition-colors disabled:opacity-20"
              aria-label="Next page"
            >
              <ChevronRight size={24} style={{ color: theme.text }} />
            </button>
          </>
        )}
      </div>

      {/* Footer: page info + progress */}
      <footer className="flex-shrink-0 px-4 py-3 space-y-2">
        <div className="flex items-center justify-center">
          <span className="text-[12px]" style={{ color: theme.text, opacity: 0.5 }}>
            {t('booksPage')
              .replace('{current}', String(currentPage + 1))
              .replace('{total}', String(totalPages))}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: `${theme.text}15` }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: preferences.theme === 'night' ? '#6366f1' : '#4f46e5',
            }}
          />
        </div>
      </footer>
    </div>
  );
}
