import React from "react"; import { Music, Radio, Clock, Trash2, Heart, ExternalLink } from "lucide-react";
import { motion } from "motion/react"; import type { SongDetailData } from "../types";
import { formatDuration } from "../utils/formatDuration"; import UiImage from "@/components/common/UiImage";
import { formatTimeAgo, itunesSearchUrl } from "../utils/formatUtils";
export type SongCardItem = SongDetailData & { id: string; timestamp: number };
type HeartAction = { filled: boolean; onClick: () => void; label: string };
type Props = { item: SongCardItem; delay: number; onRemove: () => void; onSelect?: (song: SongDetailData) => void;
  heart?: HeartAction | null; hideRemove?: boolean; };
export default React.memo(function SongCard({ item, delay, onRemove, onSelect, heart, hideRemove }: Props) { return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(delay * 0.03, 0.5) }}
      className="group bg-surface-2 rounded-xl border border-border-default overflow-hidden hover:bg-surface-3 transition-colors cursor-pointer"
      role="button" tabIndex={0} aria-label={`${item.title} by ${item.artist}`}
      onClick={() => onSelect?.({ title: item.title, artist: item.artist, album: item.album,
        artworkUrl: item.artworkUrl, itunesUrl: item.itunesUrl, durationMs: item.durationMs,
        genre: item.genre, releaseDate: item.releaseDate, trackNumber: item.trackNumber,
        trackCount: item.trackCount, stationName: item.stationName,
      })}><div className="w-full aspect-square bg-surface-3 relative">{item.artworkUrl ? (
          <UiImage src={item.artworkUrl} alt="" className="object-cover" sizes="300px" loading="lazy" />
        ) : ( <div className="size-full flex items-center justify-center"><Music size={32} className="text-dim" /></div>
        )}
        {heart && ( <button onClick={(e) => { e.stopPropagation(); heart.onClick(); }} aria-label={heart.label}
            className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-sm transition-all ${heart.filled ? "bg-pink-500/20 text-pink-400" : "bg-black/50 text-white/40 opacity-0 group-hover:opacity-100 hover:text-pink-400"}`}
          ><Heart size={12} className={heart.filled ? "fill-pink-400" : ""} /></button>
        )}
        {!hideRemove && ( <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remove"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
          ><Trash2 size={12} /></button>)}</div>
      <div className="p-3 space-y-0.5"><p className="text-[13px] font-medium text-white line-clamp-1">{item.title}</p>
        <p className="text-[12px] text-secondary line-clamp-1">{item.artist}</p>
        {item.album && <p className="text-[11px] text-dim line-clamp-1">{item.album}</p>}
        {(item.genre || item.durationMs) && ( <p className="text-[10px] text-dim line-clamp-1 flex items-center gap-1">
            {item.genre && <span>{item.genre}</span>}
            {item.durationMs && ( <span className="inline-flex items-center gap-0.5">
                <Clock size={8} className="opacity-60" />{formatDuration(item.durationMs)}</span>)}</p>)}</div>
      <div className="px-3 pb-2.5 space-y-1.5"><a href={item.itunesUrl || itunesSearchUrl(item.title, item.artist)}
          target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/60 hover:text-white/80 transition-colors"
        ><ExternalLink size={10} />Listen on Apple Music</a><div className="flex items-center gap-1.5">
          <Radio size={9} className="text-dim flex-shrink-0" />
          <p className="text-[10px] text-dim truncate flex-1">{item.stationName}</p>
          <span className="text-[10px] text-dim">{formatTimeAgo(item.timestamp)}</span></div></div></motion.div> );
}, (prev, next) =>prev.item === next.item && prev.delay === next.delay && prev.hideRemove === next.hideRemove &&
  prev.heart?.filled === next.heart?.filled);
