/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import type { HistoryEntry, SongDetailData } from '../constants';
import { SongCard } from '../components/cards/SongCard';

type HistoryGridViewProps = {
  history: HistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onToggleFavSong?: (entry: HistoryEntry) => void;
  isSongFavorite?: (title: string, artist: string) => boolean;
  onSelect?: (song: SongDetailData) => void;
};
const HistoryGridView = React.memo(function HistoryGridView({
  history,
  onRemove,
  onClear,
  onToggleFavSong,
  isSongFavorite,
  onSelect,
}: HistoryGridViewProps) {
  if (history.length === 0) {
    return (
      <div className="flex-center-col py-20 px-4">
        <Clock size={40} className="text-white/50 mb-3" />{' '}
        <p className="text-[14px] text-white/60">No listening history yet</p>{' '}
        <p className="text-[12px] text-white/50 mt-1">Songs you listen to will appear here</p>
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        {' '}
        <p className="text-[12px]text-white/50">{history.length} songs</p>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[12px] text-white/50 hover:text-red-400 transition-colors"
        >
          {' '}
          <Trash2 size={11} /> Clear all
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {' '}
        {history.map((entry, i) => (
          <SongCard
            key={entry.id}
            item={entry}
            delay={i}
            onRemove={() => onRemove(entry.id)}
            onSelect={onSelect}
            heart={
              onToggleFavSong
                ? {
                    filled: !!isSongFavorite?.(entry.title, entry.artist),
                    onClick: () => onToggleFavSong(entry),
                    label: isSongFavorite?.(entry.title, entry.artist)
                      ? 'Unlike song'
                      : 'Like song',
                  }
                : null
            }
          />
        ))}
      </div>
    </div>
  );
});

export default HistoryGridView;
export type { HistoryGridViewProps };
