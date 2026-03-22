'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Star, ChevronRight, ChevronDown, Radio } from 'lucide-react';
import { useMediaQuery } from 'usehooks-ts';
import type { Station, BrowseCategory } from '../types';
import { GENRE_CATEGORIES } from '../constants';
import { saveToStorage, loadFromStorage } from '@/lib/storageUtils';

type ContextMenu = {
  x: number;
  y: number;
  type: 'recent' | 'favorite';
  id: string;
};

type Props = {
  favorites: Station[];
  recent: Station[];
  onSearch: (query: string) => void;
  onSelectGenre: (cat: BrowseCategory) => void;
  onPlayStation: (station: Station) => void;
  onShowFavorites: () => void;
  onRemoveRecent: (uuid: string) => void;
  currentUuid: string | null;
  onRemoveFavorite?: (uuid: string) => void;
  onGoHome?: () => void;
};

export default function Sidebar({
  favorites, recent, onSearch, onSelectGenre,
  onPlayStation, onShowFavorites, onRemoveRecent, currentUuid, onRemoveFavorite, onGoHome,
}: Props) {
  const isMobile = useMediaQuery('(max-width: 768px)', { initializeWithValue: false });
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return loadFromStorage('radio-sidebar-collapsed', {});
    } catch { return {}; }});
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveToStorage('radio-sidebar-collapsed', next)
      return next;});
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, type: ContextMenu['type'], id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, type, id });
  }, []);

  const handleCtxAction = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.type === 'recent') onRemoveRecent(ctxMenu.id);
    else if (ctxMenu.type === 'favorite' && onRemoveFavorite) onRemoveFavorite(ctxMenu.id);
    setCtxMenu(null);
  }, [ctxMenu, onRemoveRecent, onRemoveFavorite]);

  // Close context menu on click outside or escape
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [ctxMenu]);

  if (isMobile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    } else {
      onGoHome?.();
    }
  };

  return (<div className="flex flex-col h-full w-full bg-surface-1 bdr-r select-none relative" style={{ flexShrink: 0 }}>
      {/* Header */}
      <button onClick={onGoHome} className="flex-row-2 px-3 pt-3 pb-2 cursor-pointer hover:opacity-80 transition-opacity">
        <Radio size={18} className="text-sys-orange" />
        <span className="text-[13px] font-semibold text-white tracking-tight">Pulse</span>
      </button>

      {/* Search */}
      <form onSubmit={handleSubmit} className="px-2 pb-2">
        <div className="flex-row-1.5 px-2 py-1.5 rounded-lg panel-2">
          <Search size={13} className="text-dim flex-shrink-0" />
 <input type="text" placeholder="Search stations…" value={query} onChange={e => setQuery(e.target.value)}
            className="bg-transparent text-[12px] text-white placeholder:text-white/25 outline-none w-full"/>
        </div></form>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 pb-2">
        {/* Favorites */}
        {favorites.length > 0 && (
          <Section label="FAVORITES" collapsed={!!collapsed['favorites']} onToggle={() => toggleCollapse('favorites')} action={<button onClick={onShowFavorites} className="text-[9px] text-subtle hover:text-white/50">All</button>}>
            {favorites.slice(0, 5).map(s => (
 <SidebarStation key={s.stationuuid} station={s} isCurrent={s.stationuuid === currentUuid} onClick={() => onPlayStation(s)}
                onContextMenu={e => handleContextMenu(e, 'favorite', s.stationuuid)}/>
            ))}
          </Section>
        )}

        {/* Recent */}
        {recent.length > 0 && (
 <Section label="RECENT" collapsed={!!collapsed['recent']} onToggle={() => toggleCollapse('recent')}>
            {recent.slice(0, 5).map(s => (
 <SidebarStation key={s.stationuuid} station={s} isCurrent={s.stationuuid === currentUuid} onClick={() => onPlayStation(s)}
                onContextMenu={e => handleContextMenu(e, 'recent', s.stationuuid)}/>
            ))}
          </Section>
        )}

        {/* Browse Genres */}
        <Section label="BROWSE" collapsed={!!collapsed['browse']} onToggle={() => toggleCollapse('browse')}>
          {GENRE_CATEGORIES.map(cat => (
 <button key={cat.id} onClick={() => onSelectGenre(cat)}
              className="w-full flex-row-2 px-2 py-1.5 rounded-lg text-left hover-1 group">
              <div className={`icon-lg rounded bg-gradient-to-br ${cat.gradient} flex-shrink-0`} />
              <span className="text-[12px] text-secondary group-hover:text-white/80 truncate flex-1">{cat.label}</span>
              <ChevronRight size={11} className="text-muted group-hover:text-white/50" />
            </button>
          ))}
        </Section></div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 py-1 min-w-[140px] rounded-lg bg-surface-3 border border-border-default shadow-xl backdrop-blur-md"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleCtxAction}
            className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-surface-5 transition-colors"
          >
            Remove
          </button>
        </div>
      )}
    </div>);
}

function Section({ label, action, children, collapsed, onToggle }: { label: string; action?: React.ReactNode; children: React.ReactNode; collapsed: boolean; onToggle: () => void }) {
  return (<div>
      <div className="flex-between px-2 mb-1">
        <button onClick={onToggle} className="flex-row-1 text-[9px] tracking-widest uppercase text-dim font-semibold hover:text-white/60 transition-colors">
          {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
          {label}
        </button>
        {!collapsed && action}
      </div>
      {!collapsed && <div className="space-y-0.5">{children}</div>}
    </div>);
}

function SidebarStation({ station, isCurrent, onClick, onContextMenu }: { station: Station; isCurrent: boolean; onClick: () => void; onContextMenu?: (e: React.MouseEvent) => void }) {
  return (<button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`w-full flex-row-2 px-2 py-1.5 rounded-lg text-left transition-colors group/station ${isCurrent ? 'bg-surface-3 text-white' : 'text-secondary hover:bg-surface-1 hover:text-white/80'}`}
    >
      {isCurrent ? <span className="dot-1.5 bg-sys-orange flex-shrink-0" /> : <Star size={10} className="text-muted flex-shrink-0" />}
      <span className="text-[11px] truncate flex-1">{station.name}</span>
    </button>);
}
