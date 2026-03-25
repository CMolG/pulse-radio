/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
'use client';
import React from 'react';
import { IoRadioOutline, IoMusicalNotesOutline, IoPersonOutline, IoDiscOutline, IoTimeOutline } from 'react-icons/io5';
import type { StationListenTime, SongPlayCount, ArtistPlayCount, GenrePlayCount } from '../hooks/useStats';
function formatListenTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000); if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60); if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60); const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m`; const days = Math.floor(hours / 24);
  const remHours = hours % 24; return `${days}d ${remHours}h`;
}
type Props = { topStations: StationListenTime[]; topSongs: SongPlayCount[];
  topArtists: ArtistPlayCount[]; topGenres: GenrePlayCount[]; totalListenMs: number;
};
const StatSection = React.memo(function StatSection({ title, icon, children, }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) { return (
    <div><div className="flex items-center gap-2 mb-2">
        {icon} <span className="text-[13px] font-semibold text-white/80">{title}</span>
      </div><div className="space-y-1">{children}</div></div>
  );});
const BarRow = React.memo(function BarRow({ label, value, maxValue, suffix }: { label: string; value: number; maxValue: number; suffix: string }) {
  const pct = maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 0;
  return ( <div className="flex items-center gap-2 group">
      <span className="text-[12px] text-white/50 w-[100px] truncate shrink-0">{label}</span>
      <div className="flex-1 h-4 rounded-full bg-white/[0.04] overflow-hidden relative"><div
          className="h-full rounded-full bg-gradient-to-r from-[#3478f6]/60 to-[#3478f6]/30 transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div><span className="text-[11px] text-white/40 tabular-nums w-[50px] text-right shrink-0">{suffix}</span></div>
  );});
export default React.memo(function StatsView({ topStations, topSongs, topArtists, topGenres, totalListenMs }: Props) {
  const hasData = totalListenMs > 0 || topSongs.length > 0;
  if (!hasData) { return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <IoTimeOutline size={40} className="text-white/20 mb-3" />
        <p className="text-[14px] text-white/40">No listening data yet</p>
        <p className="text-[12px] text-white/25 mt-1">Start playing stations to see your stats</p></div>
    );
  }
  const maxStationTime = topStations[0]?.totalMs ?? 1; const maxSongCount = topSongs[0]?.count ?? 1;
  const maxArtistCount = topArtists[0]?.count ?? 1; const maxGenreCount = topGenres[0]?.count ?? 1;
  return ( <div className="p-4 space-y-6">
      {/* Total listen time */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/8">
        <IoTimeOutline size={20} className="text-[#3478f6]" />
        <div><p className="text-[11px] text-white/40 uppercase tracking-wider">Total Listen Time</p>
          <p className="text-[18px] font-bold text-white tabular-nums">{formatListenTime(totalListenMs)}</p></div></div>
      {/* Top Stations */}
      {topStations.length > 0 && (
        <StatSection title="Top Stations" icon={<IoRadioOutline size={16} className="text-amber-400/70" />}>
          {topStations.slice(0, 5).map(s => (
            <BarRow key={s.uuid} label={s.name} value={s.totalMs} maxValue={maxStationTime} suffix={formatListenTime(s.totalMs)} />
          ))}</StatSection>
      )}
      {/* Top Songs */}
      {topSongs.length > 0 && (
        <StatSection title="Most Played Songs" icon={<IoMusicalNotesOutline size={16} className="text-pink-400/70" />}>
          {topSongs.slice(0, 5).map(s => (
            <BarRow key={`${s.title}|||${s.artist}`} label={`${s.artist} — ${s.title}`} value={s.count} maxValue={maxSongCount} suffix={`${s.count}×`} />
          ))}</StatSection>
      )}
      {/* Top Artists */}
      {topArtists.length > 0 && (
        <StatSection title="Top Artists" icon={<IoPersonOutline size={16} className="text-purple-400/70" />}>
          {topArtists.slice(0, 5).map(a => (
            <BarRow key={a.name} label={a.name} value={a.count} maxValue={maxArtistCount} suffix={`${a.count}×`} />
          ))}</StatSection>
      )}
      {/* Top Genres */}
      {topGenres.length > 0 && (
        <StatSection title="Top Genres" icon={<IoDiscOutline size={16} className="text-emerald-400/70" />}>
          {topGenres.slice(0, 5).map(g => (
            <BarRow key={g.genre} label={g.genre} value={g.count} maxValue={maxGenreCount} suffix={`${g.count}×`} />
          ))}</StatSection>)}</div>
  );});
