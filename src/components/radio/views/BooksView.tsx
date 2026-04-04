/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import React, { useRef } from 'react';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';
import { BookGlassCard } from '../components/cards/BookGlassCard';
import type { BookItem } from '@/logic/gutenberg-api';
import { loadFromStorage } from '@/logic/storage-utils';
import { STORAGE_KEYS } from '@/logic/storage-constants';

interface BooksViewProps {
  books: BookItem[];
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (q: string) => void;
  onOpenReader: (book: BookItem) => void;
}

function ShelfRail({ label, children }: { label: string; children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <section className="space-y-2">
      <h2 className="text-[14px] font-semibold text-white/80 px-1">{label}</h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </section>
  );
}

function ContinueReadingShelf({ onOpenReader }: { onOpenReader: (book: BookItem) => void }) {
  const { t } = useLocale();
  const recents = loadFromStorage<BookItem[]>(STORAGE_KEYS.BOOK_RECENTS, []);
  if (recents.length === 0) return null;

  return (
    <ShelfRail label={t('booksContinueReading')}>
      {recents.map((book) => (
        <BookGlassCard key={book.id} book={book} onRead={onOpenReader} />
      ))}
    </ShelfRail>
  );
}

export default function BooksView({
  books,
  loading,
  error,
  search,
  onSearchChange,
  onOpenReader,
}: BooksViewProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-4">
      {/* Search bar */}
      <form onSubmit={(e) => e.preventDefault()} className="flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.05]">
          <Search size={14} className="text-white/45 flex-shrink-0" aria-hidden="true" />
          <input
            type="search"
            placeholder={t('booksSearchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('booksSearchPlaceholder')}
            autoComplete="off"
            className="bg-transparent text-white text-[13px] placeholder:text-white/50 outline-none focus-visible:ring-2 focus-visible:ring-accent/70 w-full min-w-0"
          />
        </div>
      </form>

      {/* Continue Reading shelf */}
      {!search && <ContinueReadingShelf onOpenReader={onOpenReader} />}

      {/* Main results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
          <BookOpen size={32} className="text-white/20" />
          <p className="text-[13px] text-white/50">{error}</p>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
          <BookOpen size={32} className="text-white/20" />
          <p className="text-[13px] text-white/50">{t('booksNoResults')}</p>
        </div>
      ) : (
        <ShelfRail label={search ? t('booksSearchResults') : t('booksPopular')}>
          {books.map((book) => (
            <BookGlassCard key={book.id} book={book} onRead={onOpenReader} />
          ))}
        </ShelfRail>
      )}
    </div>
  );
}
