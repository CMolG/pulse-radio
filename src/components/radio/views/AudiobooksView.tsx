/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React, { useState, useCallback, useRef } from 'react';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import type { AudiobookItem } from '@/logic/librivox-api';
import type { MessageKey } from '@/logic/i18n/locales';
import AudiobookGlassCard from '../components/cards/AudiobookGlassCard';
import type { AudiobookRecent } from '../hooks/useAudiobookRecents';

type AudiobooksViewProps = {
  books: AudiobookItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  query: string;
  onSearch: (q: string) => void;
  onLoadMore: () => void;
  recents: AudiobookRecent[];
  onAddRecent: (entry: Omit<AudiobookRecent, 'lastOpenedAt'>) => void;
  t: (key: MessageKey) => string;
};

/* ── Shelf rail ────────────────────────────────────────────────────── */

function ShelfRail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="px-4 pb-2 text-[13px] font-semibold text-white/70">{label}</h3>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
        {children}
      </div>
    </section>
  );
}

const AudiobooksView = React.memo(function AudiobooksView({
  books,
  loading,
  error,
  hasMore,
  query,
  onSearch,
  onLoadMore,
  recents,
  onAddRecent,
  t,
}: AudiobooksViewProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(val);
      }, 400);
    },
    [onSearch],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch(localQuery);
    },
    [onSearch, localQuery],
  );

  const handleViewTracks = useCallback(
    (book: AudiobookItem) => {
      onAddRecent({
        bookId: book.id,
        title: book.title,
        author: book.authors.join(', ') || 'Unknown',
        coverUrl: book.coverUrl,
      });
      // Open tracks on LibriVox for now
      if (book.librivoxUrl) {
        window.open(book.librivoxUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [onAddRecent],
  );

  const isSearchActive = localQuery.trim().length > 0;

  // Filter recent books that we can show
  const recentBooks: AudiobookItem[] = recents
    .map((r) => books.find((b) => b.id === r.bookId))
    .filter((b): b is AudiobookItem => b != null)
    .slice(0, 10);

  return (
    <div className="flex flex-col min-h-0">
      {/* Search bar */}
      <div className="flex-shrink-0 px-4 pb-3">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.05]">
            <Search size={13} className="text-white/45 flex-shrink-0" aria-hidden="true" />
            <input
              type="search"
              placeholder={t('audiobooksSearchPlaceholder')}
              value={localQuery}
              onChange={handleInputChange}
              aria-label={t('audiobooksSearchPlaceholder')}
              autoComplete="off"
              className="bg-transparent text-white text-[13px] placeholder:text-white/50 outline-none focus-visible:ring-2 focus-visible:ring-accent/70 w-full min-w-0"
            />
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      {/* Loading initial */}
      {loading && books.length === 0 && (
        <div className="flex-center-col py-16">
          <Loader2 size={28} className="text-white/40 animate-spin" />
        </div>
      )}

      {/* Content shelves */}
      {!error && books.length > 0 && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Continue Listening */}
          {recentBooks.length > 0 && !isSearchActive && (
            <ShelfRail label={t('audiobooksContinueListening')}>
              {recentBooks.map((book) => (
                <AudiobookGlassCard
                  key={`recent-${book.id}`}
                  book={book}
                  onViewTracks={handleViewTracks}
                  t={t}
                />
              ))}
            </ShelfRail>
          )}

          {/* Featured Classics / Search Results */}
          <ShelfRail
            label={isSearchActive ? t('audiobooksSearchResults') : t('audiobooksFeatured')}
          >
            {books.map((book) => (
              <AudiobookGlassCard key={book.id} book={book} onViewTracks={handleViewTracks} t={t} />
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loading}
                className="flex-shrink-0 w-44 sm:w-48 min-h-[44px] rounded-xl border border-white/10 flex items-center justify-center text-[13px] text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-colors snap-start"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : t('seeMore')}
              </button>
            )}
          </ShelfRail>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && books.length === 0 && (
        <div className="flex-center-col py-20 px-4">
          <BookOpen size={40} className="text-white/50 mb-3" />
          <p className="text-[14px] text-white/60">{t('audiobooksNoResults')}</p>
        </div>
      )}
    </div>
  );
});

export default AudiobooksView;
export type { AudiobooksViewProps };
