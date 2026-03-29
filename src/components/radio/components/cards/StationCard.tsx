import React, {useMemo, useState} from "react";
import {Heart, Loader2, Music2, Pause, Play, Radio as RadioIcon} from "lucide-react";
import {motion} from "motion/react";
import {countryFlag} from "@/logic/format-utils";
import {stationInitials} from "@/logic/format-utils";
import {UiImage} from "../UiImage";
import type {StationCardProps} from "../types";

const StationCard = React.memo(
    function StationCard({
                             station,
                             isPlaying,
                             isCurrent,
                             isFavorite,
                             onPlay,
                             onToggleFav,
                             liveStatus,
                             liveTrack,
                             onPeek,
                             onPrefetch,
                         }: StationCardProps) {
        const [imgError, setImgError] = useState(false);
        const showFallback = !station.favicon || imgError;
        const tags = useMemo(() => {
            const raw = station.tags;
            if (!raw) return [];
            const ci = raw.indexOf(',');
            const first = (ci < 0 ? raw : raw.slice(0, ci)).trim();
            return first ? [first] : [];
        }, [station.tags]);
        return (
            <div
                role="button"
                tabIndex={0}
                aria-label={`${station.name}${isCurrent && isPlaying ? ' (playing)' : ''}`}
                className={`group cursor-pointer rounded-xl p-2 transition-all duration-150 ${isCurrent ? 'bg-surface-3 ring-1 ring-border-strong' : 'hover:bg-surface-2'}`}
                onClick={onPlay}
                onMouseEnter={onPrefetch}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPlay();
                    }
                }}
            >
                {' '}
                {/* Artwork */}{' '}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-2 mb-2">
                    {' '}
                    {showFallback ? (
                        <div className="size-full dawn-gradient flex-center-row">
                            {' '}
                            <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {stationInitials(station.name) || <RadioIcon size={20} className="text-white/60" />}
              </span>
                        </div>
                    ) : (
                        <UiImage
                            src={station.favicon}
                            alt=""
                            className="object-cover"
                            sizes="180px"
                            loading="lazy"
                            onError={() => setImgError(true)}
                        />
                    )}{' '}
                    {/* Play overlay */}{' '}
                    <motion.button
                        aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.1 }}
                        className={`app-overlay-center bg-black/40 transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPlay();
                        }}
                    >
                        {' '}
                        <div className="dot-10 bg-sys-orange flex-center-row shadow-lg shadow-black/30">
                            {' '}
                            {isCurrent && isPlaying ? (
                                <Pause size={18} className="text-white" />
                            ) : (
                                <Play size={18} className="text-white ml-0.5" />
                            )}{' '}
                        </div>
                    </motion.button>{' '}
                    {/* Favorite badge */}{' '}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFav();
                        }}
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={isFavorite}
                        className={`absolute top-1.5 right-1.5 p-2 rounded-full transition-all duration-150 ${isFavorite ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-black/50'}`}
                    >
                        <Heart size={12} className={isFavorite ? 'text-pink-400 fill-pink-400' : 'text-soft'} />
                    </button>{' '}
                    {/* Now-playing indicator */}{' '}
                    {isCurrent && isPlaying && (
                        <span className="absolute bottom-1.5 left-1.5 dot-2 bg-sys-orange animate-pulse" />
                    )}{' '}
                </div>{' '}
                {/* Name */}{' '}
                <p className="text-[12px] font-medium text-white truncate leading-tight">{station.name}</p>{' '}
                {/* Tags / Country / Format */}{' '}
                <div className="flex-row-1 mt-1 flex-wrap">
                    {station.codec && (
                        <span className="pad-xs bg-surface-3 text-[12px] font-mono text-white/60 uppercase flex-shrink-0">
              {' '}
                            {station.codec}
                            {station.bitrate > 0 ? ` ${station.bitrate}k` : ''}
            </span>
                    )}{' '}
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="pad-xs-full bg-surface-2 text-[12px] text-white/60 truncate max-w-[80px]"
                        >
              {tag}
            </span>
                    ))}{' '}
                    {station.countrycode && (
                        <span className="text-[12px] text-white/50 leading-none">
              {countryFlag(station.countrycode)}
            </span>
                    )}
                </div>{' '}
                {/* Live track preview */}{' '}
                {liveStatus === 'loading' && (
                    <div className="flex items-center gap-1 mt-1.5">
                        {' '}
                        <Loader2
                            size={9}
                            className="text-white/50 animate-spin flex-shrink-0"
                            aria-hidden="true"
                        />{' '}
                        <span className="text-[12px]text-white/50" role="status">
              Checking…
            </span>
                    </div>
                )}{' '}
                {liveStatus === 'loaded' && (
                    <div className="flex items-center gap-1 mt-1.5 min-w-0">
                        {' '}
                        {liveTrack ? (
                            <>
                                <Music2 size={9} className="text-sys-orange flex-shrink-0" />{' '}
                                <span className="text-[12px] text-white/60 truncate leading-tight">
                  {' '}
                                    {liveTrack.artist ? `${liveTrack.artist} – ${liveTrack.title}` : liveTrack.title}
                </span>
                            </>
                        ) : (
                            <span className="text-[12px] text-white/50">No track info</span>
                        )}
                    </div>
                )}{' '}
                {onPeek && !liveStatus && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPeek();
                        }}
                        className="flex items-center gap-1 mt-1.5 text-[12px] text-white/50 hover:text-white/50 transition-colors"
                    >
                        {' '}
                        <Music2 size={9} /> Check track
                    </button>
                )}{' '}
            </div>
        );
    },
    (prev, next) =>
        prev.station === next.station &&
        prev.isPlaying === next.isPlaying &&
        prev.isCurrent === next.isCurrent &&
        prev.isFavorite === next.isFavorite &&
        prev.liveStatus === next.liveStatus &&
        prev.liveTrack === next.liveTrack,
);

export default StationCard;