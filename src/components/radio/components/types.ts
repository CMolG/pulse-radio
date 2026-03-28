import React from "react";
import type { SongDetailData, Station } from "../constants";

export type LiquidGlassButtonProps = {
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    'aria-label'?: string;
    'aria-pressed'?: boolean;
    className?: string;
    children: React.ReactNode;
};

export type UiImageProps = {
    src: string;
    alt: string;
    className?: string;
    sizes?: string;
    priority?: boolean;
    loading?: 'lazy' | 'eager';
    onError?: () => void;
    style?: React.CSSProperties;
};

export type SongCardItem = SongDetailData & { id: string; timestamp: number };
export type HeartAction = { filled: boolean; onClick: () => void; label: string };
export type SongCardProps = {
    item: SongCardItem;
    delay: number;
    onRemove: () => void;
    onSelect?: (song: SongDetailData) => void;
    heart?: HeartAction | null;
    hideRemove?: boolean;
};

export type StationCardProps = {
    station: Station;
    isPlaying: boolean;
    isCurrent: boolean;
    isFavorite: boolean;
    onPlay: () => void;
    onToggleFav: () => void;
    liveStatus?: 'loading' | 'loaded' | 'error';
    liveTrack?: { title: string; artist: string } | null;
    onPeek?: () => void;
    onPrefetch?: () => void;
};