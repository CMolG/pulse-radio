/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { UiImage } from '../UiImage';
import type { BookItem } from '@/logic/gutenberg-api';
import { useLocale } from '@/context/LocaleContext';

interface BookGlassCardProps {
  book: BookItem;
  onRead: (book: BookItem) => void;
}

export const BookGlassCard = React.memo(function BookGlassCard({
  book,
  onRead,
}: BookGlassCardProps) {
  const { t } = useLocale();
  const author = book.authors[0] ?? 'Unknown';
  const subjects = book.subjects.slice(0, 2);

  return (
    <div
      className="group flex-shrink-0 w-[180px] sm:w-[200px] rounded-2xl border border-white/10 overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: 'rgba(30, 30, 50, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Cover */}
      <div className="relative w-full aspect-[2/3] bg-white/5">
        {book.coverUrl ? (
          <UiImage
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <BookOpen size={48} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="text-[13px] font-semibold text-white leading-tight line-clamp-2">
          {book.title}
        </h3>
        <p className="text-[11px] text-white/60 truncate">{author}</p>
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {subjects.map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/50 truncate max-w-[90px]"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1.5">
          <button
            onClick={() => onRead(book)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium bg-white/10 text-white hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px]"
            aria-label={`${t('booksRead')} ${book.title}`}
          >
            <BookOpen size={14} aria-hidden="true" />
            {t('booksRead')}
          </button>
          <a
            href={book.gutenbergUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-11 h-11 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
            aria-label={t('booksOpenGutenberg')}
          >
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
});
