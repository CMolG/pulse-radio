/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { AudiobookItem } from '@/logic/librivox-api';
import type { MessageKey } from '@/logic/i18n/locales';

type AudiobookGlassCardProps = {
  book: AudiobookItem;
  onViewTracks: (book: AudiobookItem) => void;
  t: (key: MessageKey) => string;
};

function formatBookDuration(secs: number | null): string {
  if (secs == null || secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const AudiobookGlassCard = React.memo(function AudiobookGlassCard({
  book,
  onViewTracks,
  t,
}: AudiobookGlassCardProps) {
  const authorText = book.authors.length > 0 ? book.authors.join(', ') : 'Unknown';
  const duration = formatBookDuration(book.durationSecs);

  return (
    <div
      className="flex-shrink-0 w-44 sm:w-48 rounded-xl border border-white/10 overflow-hidden snap-start"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Cover image */}
      <div className="w-full aspect-square bg-white/[0.04] relative">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="size-full flex items-center justify-center">
            <BookOpen size={32} className="text-white/40" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-2.5 space-y-0.5">
        <p className="text-[13px] font-medium text-white line-clamp-2 leading-tight">
          {book.title}
        </p>
        <p className="text-[11px] text-white/55 line-clamp-1">{authorText}</p>
        {duration && <p className="text-[11px] text-white/40">{duration}</p>}
      </div>

      {/* Actions */}
      <div className="px-2.5 pb-2.5 space-y-1.5">
        <button
          onClick={() => onViewTracks(book)}
          className="flex items-center justify-center gap-1.5 w-full min-h-[44px] rounded-lg text-[12px] font-medium text-white/70 hover:text-white transition-colors"
          style={{
            background: 'rgba(255,255,255,0.08)',
          }}
          aria-label={`${t('audiobooksViewTracks')} — ${book.title}`}
        >
          <BookOpen size={12} />
          {t('audiobooksViewTracks')}
        </button>
        <a
          href={book.librivoxUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full min-h-[44px] rounded-lg text-[12px] font-medium text-white/50 hover:text-white/70 transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
          }}
          aria-label={`${t('audiobooksOpenLibrivox')} — ${book.title}`}
        >
          <ExternalLink size={10} />
          {t('audiobooksOpenLibrivox')}
        </a>
      </div>
    </div>
  );
});

export default AudiobookGlassCard;
export type { AudiobookGlassCardProps };
