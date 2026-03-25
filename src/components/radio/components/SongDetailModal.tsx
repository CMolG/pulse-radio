/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Radio, Globe, Calendar, Music, User, Users, Clock, Disc3, Tag, Trash2 } from 'lucide-react';
import type { SongDetailData } from '../types';
import { useArtistInfo } from '../hooks/useArtistInfo';
import { useLyrics } from '../hooks/useLyrics';
import { formatDuration, formatReleaseDate } from '../utils/formatDuration';
import { useAlbumArt } from '@/lib/audio-visualizer';
import UiImage from '@/components/common/UiImage';
import { itunesSearchUrl } from '../utils/formatUtils';

const BADGE_CLS = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]';
const MetaBadge = ({ icon: Icon, cls, children }: { icon: typeof Clock; cls: string; children: React.ReactNode }) => (
  <span className={`${BADGE_CLS} ${cls}`}><Icon size={9} />{children}</span>
);

type Props = { song: SongDetailData | null; onClose: () => void; onRemoveFromFavorites?: () => void };

function SongDetailModal({ song, onClose, onRemoveFromFavorites }: Props) {
  const { info, loading } = useArtistInfo(song?.artist ?? null);
  const albumMeta = useAlbumArt(song?.title ?? null, song?.artist ?? null);
  const resolvedArtworkUrl = song?.artworkUrl ?? albumMeta.artworkUrl ?? undefined;
  const resolvedAlbum = song?.album ?? albumMeta.albumName ?? undefined;
  const resolvedItunesUrl = song?.itunesUrl ?? albumMeta.itunesUrl ?? undefined;
  const resolvedDurationMs = song?.durationMs ?? albumMeta.durationMs ?? null;
  const resolvedGenre = song?.genre ?? albumMeta.genre ?? null;
  const resolvedReleaseDate = song?.releaseDate ?? albumMeta.releaseDate ?? null;
  const resolvedTrackNumber = song?.trackNumber ?? albumMeta.trackNumber ?? null;
  const resolvedTrackCount = song?.trackCount ?? albumMeta.trackCount ?? null;
  const showMetaHydration = Boolean(
    song &&
    (song.durationMs == null ||
      song.genre == null ||
      song.releaseDate == null ||
      song.trackNumber == null || song.trackCount == null),
  ) && albumMeta.isLoading;
  const { lyrics, loading: lyricsLoading, error: lyricsError, retry: retryLyrics } = useLyrics(
    song ? { title: song.title, artist: song.artist, album: resolvedAlbum, } : null, song?.stationName ?? null,
  );
  const plainLyrics =
    lyrics?.plainText?.trim() ||
    lyrics?.lines ?.map((line) => line.text.trim()).filter(Boolean).join('\n')
      .trim() || '';
  const skeletonWidths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-10/12', 'w-7/12'];
  const lyricsSkeleton = (n: number) => (
    <div className="space-y-2 animate-pulse">
      {skeletonWidths.slice(0, n).map((w, i) => <div key={i} className={`h-2.5 bg-surface-3 rounded ${w}`} />)}</div>
  );
  const lyricsEmpty = (
    <div><p className="text-[12px] text-dim">{lyricsError ? 'Failed to load lyrics' : 'No lyrics available'}</p>
      {lyricsError && (
        <button onClick={retryLyrics} className="mt-2 px-3 py-1 text-[11px] rounded-md bg-sys-orange/20 text-sys-orange hover:bg-sys-orange/30 transition-colors">
          Retry</button>)}</div>
  );
  // Close on Escape
  useEffect(() => {
    if (!song) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [song, onClose]);
  // Focus trap: keep Tab cycling within the modal
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!song || !modalRef.current) return; const modal = modalRef.current;
    const prev = document.activeElement as HTMLElement | null;
    // Focus first focusable element
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ); focusable[0]?.focus();
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ); if (nodes.length === 0) return; const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }; window.addEventListener('keydown', onTab);
    return () => { window.removeEventListener('keydown', onTab); prev?.focus(); };
  }, [song]);
  return (
    <AnimatePresence>
      {song && (
        <motion.div
          key="song-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={onClose}><motion.div
            key="song-detail-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Song details: ${song.title} by ${song.artist}`}
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="w-full max-w-[860px] mx-4 md:flex md:items-stretch md:gap-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-surface-2 rounded-2xl border border-border-default shadow-2xl w-full max-w-[380px] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {/* Close button */} <div className="sticky top-0 z-10 flex justify-end p-3"><button
                  onClick={onClose}
                  aria-label="Close song details"
                  className="p-2 rounded-full bg-surface-3/80 backdrop-blur-sm text-white/60 hover:text-white hover:bg-surface-4 transition-colors"
                ><X size={16} /></button></div>
              {/* ── Song Info ── */} <div className="px-5 -mt-2">
                {/* Artwork */}
                <div className="relative w-full aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-surface-3 shadow-xl">
                  {resolvedArtworkUrl ? (
                    <UiImage
                      src={resolvedArtworkUrl}
                      alt={`Album art for ${song.title} by ${song.artist}`}
                      className="object-cover"
                      sizes="240px"
                      loading="lazy" />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Music size={56} className="text-dim" /></div>)}</div>
                {/* Title & artist */} <div className="mt-5 text-center">
                  <h2 className="text-[17px] font-bold text-white leading-snug line-clamp-2">{song.title}</h2>
                  <p className="text-[14px] text-secondary mt-1">{song.artist}</p> {resolvedAlbum && (
                    <p className="text-[12px] text-dim mt-0.5">{resolvedAlbum}</p>
                  )}
                  {/* Extended metadata: corner-style row + release line + context badges */}
                  {(resolvedDurationMs || resolvedTrackNumber != null || resolvedReleaseDate || resolvedGenre) && (
                    <div className="mt-2 space-y-1.5"><div className="grid grid-cols-2 items-start">
                        <div className="justify-self-start">
                          {resolvedDurationMs && (
                            <MetaBadge icon={Clock} cls="bg-white/[0.08] border border-white/10 font-mono text-white/70">{formatDuration(resolvedDurationMs)}</MetaBadge>
                          )}</div><div className="justify-self-end">
                          {resolvedTrackNumber != null && resolvedTrackCount != null && (
                            <MetaBadge icon={Disc3} cls="bg-white/[0.08] border border-white/10 text-white/70">#{resolvedTrackNumber}/{resolvedTrackCount}</MetaBadge>
                          )}</div></div>
                      {resolvedReleaseDate && (
                        <p className="text-[10px] text-white/50">
                          Released on: {formatReleaseDate(resolvedReleaseDate)}</p>
                      )} <div className="flex flex-wrap justify-center gap-1.5">
                        {resolvedGenre && <MetaBadge icon={Tag} cls="bg-white/[0.06] text-white/50">{resolvedGenre}</MetaBadge>}
                      {showMetaHydration && <MetaBadge icon={Clock} cls="bg-white/[0.06] text-white/40 animate-pulse">Fetching metadata…</MetaBadge>}
                      </div></div>)}</div>
                {/* Apple Music button */} <a
                  href={ resolvedItunesUrl || itunesSearchUrl(song.title, song.artist) }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[13px] font-medium text-white/70 hover:text-white transition-colors"
                ><ExternalLink size={14} />
                  Listen on Apple Music</a></div>
              {/* Divider */} <div className="mx-5 my-5 border-t border-border-default" /> {/* ── Artist Info ── */}
              <div className="px-5"><h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-3">
                  About {song.artist}</h3>
                {/* Loading skeleton */}
                {loading && (
                  <div className="space-y-3 animate-pulse"><div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-surface-3 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1"><div className="h-3 bg-surface-3 rounded w-2/3" />
                        <div className="h-2.5 bg-surface-3 rounded w-1/2" /></div></div><div className="space-y-2">
                      <div className="h-2.5 bg-surface-3 rounded w-full" />
                      <div className="h-2.5 bg-surface-3 rounded w-5/6" />
                      <div className="h-2.5 bg-surface-3 rounded w-4/6" /></div></div>
                )}
                {/* Loaded artist data */}
                {!loading && info && (
                  <div className="space-y-3">
                    {/* Artist header with image */} <div className="flex gap-3">
                      {info.imageUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"><UiImage
                            src={info.imageUrl}
                            alt={info.name}
                            className="object-cover bg-surface-3"
                            sizes="64px"
                            loading="lazy" /></div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-surface-3 flex-shrink-0 flex items-center justify-center">
                          {info.type === 'Group' ? (
                            <Users size={24} className="text-dim" />
                          ) : (
                            <User size={24} className="text-dim" />
                          )}</div>
                      )} <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-[14px] font-semibold text-white truncate">{info.name}</p>
                        {info.disambiguation && (
                          <p className="text-[11px] text-dim mt-0.5 line-clamp-1">{info.disambiguation}</p>
                        )}
                        {/* Metadata badges */} <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {info.type && <MetaBadge icon={info.type === 'Group' ? Users : User} cls="bg-surface-3 text-secondary">{info.type}</MetaBadge>}
                          {info.country && <MetaBadge icon={Globe} cls="bg-surface-3 text-secondary">{info.country}</MetaBadge>}
                          {info.lifeSpan?.begin && (
                            <MetaBadge icon={Calendar} cls="bg-surface-3 text-secondary">
                              {info.lifeSpan.begin}{info.lifeSpan.ended && info.lifeSpan.end ? ` – ${info.lifeSpan.end}` : ' – present'}
                            </MetaBadge>)}</div></div></div>
                    {/* Bio */}
                    {info.bio && (
                      <p className="text-[12px] text-secondary/90 leading-relaxed">{info.bio}</p>
                    )}
                    {/* Genre tags */}
                    {info.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {info.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full bg-white/[0.06] text-[10px] font-medium text-white/50">
                            {tag}</span>))}</div>
                    )}
                    {/* Wikipedia link */}
                    {info.wikipediaUrl && (
                      <a
                        href={info.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
                      ><Globe size={11} />
                        Read more on Wikipedia</a>)}</div>
                )}
                {/* No data */}
                {!loading && !info && (
                  <p className="text-[12px] text-dim">No artist information available</p>)}</div>
              {/* Divider */} <div className="mx-5 my-5 border-t border-border-default" />
              {/* ── Lyrics (mobile) ── */} <div className="px-5 md:hidden">
                <h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-3">Lyrics (plain)</h3>
                {lyricsLoading && lyricsSkeleton(4)}
                {!lyricsLoading && plainLyrics && (
                  <div className="max-h-52 overflow-y-auto rounded-xl bg-surface-3/50 border border-border-subtle p-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-secondary/90">
                      {plainLyrics}</pre></div>
                )}
                {!lyricsLoading && !plainLyrics && lyricsEmpty}</div>
              {/* Divider (mobile) */} <div className="mx-5 my-5 border-t border-border-default md:hidden" />
              {/* ── Remove from favorites ── */}
              {onRemoveFromFavorites && (
                <><div className="mx-5 my-5 border-t border-border-default" />
                  <div className="px-5 pb-2"><button
                      onClick={onRemoveFromFavorites}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[13px] font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                    ><Trash2 size={14} />
                      Borrar de favoritos</button></div></>
              )}
              {/* ── Station ── */} <div className="px-5 pb-6 pt-4"><div className="flex items-center gap-2">
                  <Radio size={12} className="text-dim flex-shrink-0" /> <p className="text-[11px] text-dim">
                    Played on{' '} <span className="text-secondary">{song.stationName}</span></p></div></div></div>
            {/* ── Lyrics side panel (desktop) ── */}
            <div className="hidden md:flex md:flex-col bg-surface-2 rounded-2xl border border-border-default shadow-2xl w-[420px] max-h-[85vh]">
              <div className="px-5 pt-5 pb-3 border-b border-border-default">
                <h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider">Lyrics (plain)</h3>
                <p className="text-[11px] text-dim mt-1 line-clamp-1">{song.title} · {song.artist}</p></div>
              <div className="flex-1 p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {lyricsLoading && lyricsSkeleton(7)}
                {!lyricsLoading && plainLyrics && (
                  <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-secondary/90">
                    {plainLyrics}</pre>
                )}
                {!lyricsLoading && !plainLyrics && lyricsEmpty}</div></div></motion.div>
        </motion.div>)}</AnimatePresence>
  );
}

export default React.memo(SongDetailModal);