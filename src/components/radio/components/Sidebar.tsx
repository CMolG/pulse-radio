/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, Radio } from 'lucide-react';
import type { BrowseCategory } from '../types';
import { GENRE_CATEGORIES, STORAGE_KEYS } from '../constants';
import { saveToStorage, loadFromStorage } from '@/lib/storageUtils';

type Props = {
  onSearch: (query: string) => void;
  onSelectGenre: (cat: BrowseCategory) => void;
  onGoHome?: () => void;
};

export default function Sidebar({
  onSearch, onSelectGenre, onGoHome,
}: Props) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    loadFromStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, {})
  );

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
  }, [collapsed]);

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
      <button onClick={onGoHome} className="flex-row-2 px-4 pt-4 pb-3 cursor-pointer hover:opacity-80 transition-opacity">
        <Radio size={20} className="text-sys-orange" />
        <span className="text-[15px] font-semibold text-white tracking-tight">Pulse</span>
      </button>

      {/* Search */}
      <form onSubmit={handleSubmit} className="px-3 pb-3">
        <div className="flex-row-2 px-3 py-2.5 rounded-xl panel-2">
          <Search size={15} className="text-dim flex-shrink-0" />
          <input type="text" placeholder="Search stations…" value={query} onChange={e => setQuery(e.target.value)}
            aria-label="Search stations"
            className="bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none w-full"/>
        </div></form>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
        {/* Browse Genres */}
        <Section label="BROWSE" collapsed={!!collapsed['browse']} onToggle={() => toggleCollapse('browse')}>
          {GENRE_CATEGORIES.map(cat => (
  <button key={cat.id} onClick={() => onSelectGenre(cat)}
              className="w-full flex-row-2 px-2.5 py-2.5 rounded-xl text-left hover-1 group active:scale-[0.98] transition-transform">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.gradient} flex-shrink-0`} />
              <span className="text-[13px] text-secondary group-hover:text-white/80 truncate flex-1">{cat.label}</span>
              <ChevronRight size={14} className="text-muted group-hover:text-white/50" />
            </button>
          ))}
        </Section></div>
    </div>);
}

function Section({ label, action, children, collapsed, onToggle }: { label: string; action?: React.ReactNode; children: React.ReactNode; collapsed: boolean; onToggle: () => void }) {
  return (<div>
      <div className="flex-between px-2.5 mb-1.5">
        <button onClick={onToggle} aria-expanded={!collapsed} className="flex-row-1.5 text-[10px] tracking-widest uppercase text-dim font-semibold hover:text-white/60 transition-colors py-1">
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          {label}
        </button>
        {!collapsed && action}
      </div>
      {!collapsed && <div className="space-y-0.5">{children}</div>}
    </div>);
}
