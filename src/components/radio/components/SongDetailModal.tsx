/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ExternalLink,
  Radio,
  Globe,
  Calendar,
  Music,
  User,
  Users,
} from 'lucide-react';
import type { SongDetailData } from '../types';
import { useArtistInfo } from '../hooks/useArtistInfo';
import { useLyrics } from '../hooks/useLyrics';

const ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';

function itunesSearchUrl(title: string, artist: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://music.apple.com/search?term=${q}&${ITUNES_REFERRER}`;
}

type Props = {
  song: SongDetailData | null;
  onClose: () => void;
};

export default function SongDetailModal({ song, onClose }: Props) {
  const { info, loading } = useArtistInfo(song?.artist ?? null);
  const { lyrics, loading: lyricsLoading } = useLyrics(
    song
      ? {
          title: song.title,
          artist: song.artist,
          album: song.album,
        }
      : null,
    song?.stationName ?? null,
  );

  const plainLyrics =
    lyrics?.plainText?.trim() ||
    lyrics?.lines
      ?.map((line) => line.text.trim())
      .filter(Boolean)
      .join('\n')
      .trim() ||
    '';

  // Close on Escape
  useEffect(() => {
    if (!song) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [song, onClose]);

  return (
    <AnimatePresence>
      {song && (
        <motion.div
          key="song-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            key="song-detail-modal"
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="w-full max-w-[860px] mx-4 md:flex md:items-stretch md:gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-2 rounded-2xl border border-border-default shadow-2xl w-full max-w-[380px] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {/* Close button */}
              <div className="sticky top-0 z-10 flex justify-end p-3">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-surface-3/80 backdrop-blur-sm text-white/60 hover:text-white hover:bg-surface-4 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ── Song Info ── */}
              <div className="px-5 -mt-2">
                {/* Artwork */}
                <div className="w-full aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-surface-3 shadow-xl">
                  {song.artworkUrl ? (
                    <img
                      src={song.artworkUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Music size={56} className="text-dim" />
                    </div>
                  )}
                </div>

                {/* Title & artist */}
                <div className="mt-5 text-center">
                  <h2 className="text-[17px] font-bold text-white leading-snug line-clamp-2">
                    {song.title}
                  </h2>
                  <p className="text-[14px] text-secondary mt-1">
                    {song.artist}
                  </p>
                  {song.album && (
                    <p className="text-[12px] text-dim mt-0.5">{song.album}</p>
                  )}
                </div>

                {/* Apple Music button */}
                <a
                  href={
                    song.itunesUrl ||
                    itunesSearchUrl(song.title, song.artist)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[13px] font-medium text-white/70 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} />
                  Listen on Apple Music
                </a>
              </div>

              {/* Divider */}
              <div className="mx-5 my-5 border-t border-border-default" />

              {/* ── Artist Info ── */}
              <div className="px-5">
                <h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-3">
                  About {song.artist}
                </h3>

                {/* Loading skeleton */}
                {loading && (
                  <div className="space-y-3 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-surface-3 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-surface-3 rounded w-2/3" />
                        <div className="h-2.5 bg-surface-3 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 bg-surface-3 rounded w-full" />
                      <div className="h-2.5 bg-surface-3 rounded w-5/6" />
                      <div className="h-2.5 bg-surface-3 rounded w-4/6" />
                    </div>
                  </div>
                )}

                {/* Loaded artist data */}
                {!loading && info && (
                  <div className="space-y-3">
                    {/* Artist header with image */}
                    <div className="flex gap-3">
                      {info.imageUrl ? (
                        <img
                          src={info.imageUrl}
                          alt={info.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-surface-3"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-surface-3 flex-shrink-0 flex items-center justify-center">
                          {info.type === 'Group' ? (
                            <Users size={24} className="text-dim" />
                          ) : (
                            <User size={24} className="text-dim" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[14px] font-semibold text-white truncate">
                          {info.name}
                        </p>
                        {info.disambiguation && (
                          <p className="text-[11px] text-dim mt-0.5 line-clamp-1">
                            {info.disambiguation}
                          </p>
                        )}
                        {/* Metadata badges */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {info.type && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-3 text-[10px] text-secondary">
                              {info.type === 'Group' ? (
                                <Users size={9} />
                              ) : (
                                <User size={9} />
                              )}
                              {info.type}
                            </span>
                          )}
                          {info.country && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-3 text-[10px] text-secondary">
                              <Globe size={9} />
                              {info.country}
                            </span>
                          )}
                          {info.lifeSpan?.begin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-3 text-[10px] text-secondary">
                              <Calendar size={9} />
                              {info.lifeSpan.begin}
                              {info.lifeSpan.ended && info.lifeSpan.end
                                ? ` – ${info.lifeSpan.end}`
                                : ' – present'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    {info.bio && (
                      <p className="text-[12px] text-secondary/90 leading-relaxed">
                        {info.bio}
                      </p>
                    )}

                    {/* Genre tags */}
                    {info.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {info.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full bg-white/[0.06] text-[10px] font-medium text-white/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Wikipedia link */}
                    {info.wikipediaUrl && (
                      <a
                        href={info.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
                      >
                        <Globe size={11} />
                        Read more on Wikipedia
                      </a>
                    )}
                  </div>
                )}

                {/* No data */}
                {!loading && !info && (
                  <p className="text-[12px] text-dim">
                    No artist information available
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="mx-5 my-5 border-t border-border-default" />

              {/* ── Lyrics (mobile) ── */}
              <div className="px-5 md:hidden">
                <h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-3">
                  Lyrics (plain)
                </h3>

                {lyricsLoading && (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-2.5 bg-surface-3 rounded w-full" />
                    <div className="h-2.5 bg-surface-3 rounded w-11/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-10/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-9/12" />
                  </div>
                )}

                {!lyricsLoading && plainLyrics && (
                  <div className="max-h-52 overflow-y-auto rounded-xl bg-surface-3/50 border border-border-subtle p-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-secondary/90">
                      {plainLyrics}
                    </pre>
                  </div>
                )}

                {!lyricsLoading && !plainLyrics && (
                  <p className="text-[12px] text-dim">No lyrics available</p>
                )}
              </div>

              {/* Divider (mobile) */}
              <div className="mx-5 my-5 border-t border-border-default md:hidden" />

              {/* ── Station ── */}
              <div className="px-5 pb-6">
                <div className="flex items-center gap-2">
                  <Radio size={12} className="text-dim flex-shrink-0" />
                  <p className="text-[11px] text-dim">
                    Played on{' '}
                    <span className="text-secondary">{song.stationName}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Lyrics side panel (desktop) ── */}
            <div className="hidden md:flex md:flex-col bg-surface-2 rounded-2xl border border-border-default shadow-2xl w-[420px] max-h-[85vh]">
              <div className="px-5 pt-5 pb-3 border-b border-border-default">
                <h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider">
                  Lyrics (plain)
                </h3>
                <p className="text-[11px] text-dim mt-1 line-clamp-1">
                  {song.title} · {song.artist}
                </p>
              </div>

              <div className="flex-1 p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {lyricsLoading && (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-2.5 bg-surface-3 rounded w-full" />
                    <div className="h-2.5 bg-surface-3 rounded w-11/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-10/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-9/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-8/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-10/12" />
                    <div className="h-2.5 bg-surface-3 rounded w-7/12" />
                  </div>
                )}

                {!lyricsLoading && plainLyrics && (
                  <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-secondary/90">
                    {plainLyrics}
                  </pre>
                )}

                {!lyricsLoading && !plainLyrics && (
                  <p className="text-[12px] text-dim">No lyrics available</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
