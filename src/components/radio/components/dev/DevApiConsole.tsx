/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useApiLogStore } from '@/logic/dev-api-logger';
import type { ApiLogEntry } from '@/logic/dev-api-logger';

const DevApiConsole = React.memo(function DevApiConsole() {
  const entries = useApiLogStore((s) => s.entries);
  const clear = useApiLogStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length, open]);
  if (process.env.NODE_ENV !== 'development') return null;
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const copyToClipboard = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(key);
          setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1500);
        })
        .catch(() => {});
    }
  };
  const statusColor = (s?: number) => {
    if (!s) return 'text-red-400';
    if (s >= 200 && s < 300) return 'text-green-400';
    if (s >= 300 && s < 400) return 'text-yellow-400';
    return 'text-red-400';
  };
  const kindLabel = (kind: ApiLogEntry['kind']) => {
    if (kind === 'request') return 'REQ';
    if (kind === 'response') return 'RES';
    return 'ERR';
  };
  const kindColor = (kind: ApiLogEntry['kind']) => {
    if (kind === 'request') return 'bg-sky-600/80';
    if (kind === 'response') return 'bg-emerald-600/80';
    return 'bg-red-600/80';
  };
  const apiLabel = (url: string) => {
    if (url.includes('/api/icy-meta')) return 'ICY';
    if (url.includes('/api/itunes')) return 'iTunes';
    if (url.includes('/api/concerts')) return 'CONCERTS';
    if (url.includes('/api/artist-info')) return 'ARTIST';
    if (url.includes('lrclib.net')) return 'LYRICS';
    if (url.includes('/api/lyrics')) return 'LYRICS';
    return 'API';
  };
  const labelColor = (url: string) => {
    if (url.includes('/api/icy-meta')) return 'bg-cyan-600/80';
    if (url.includes('/api/itunes')) return 'bg-pink-600/80';
    if (url.includes('/api/concerts')) return 'bg-orange-600/80';
    if (url.includes('/api/artist-info')) return 'bg-purple-600/80';
    if (url.includes('lrclib.net') || url.includes('/api/lyrics')) return 'bg-emerald-600/80';
    return 'bg-gray-600/80';
  };
  return (
    <div
      className="fixed bottom-50 right-2 z-9999 pointer-events-auto"
      style={{ maxWidth: 480, width: 'calc(100vw - 16px)', zIndex: 9999 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-black/80 text-green-400 border border-green-500/30 hover:bg-black/90 transition-colors shadow-lg"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>API Console ({entries.length})</span>
        <span className="text-white/30 ml-1">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div
          className="mt-1 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
          style={{
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] font-mono font-bold text-green-400/80">
              ⚡ API Console
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={clear}
                className="text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[12px] font-mono text-white/40 hover:text-white/70 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto font-mono text-[10px] leading-relaxed [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
            {entries.length === 0 && (
              <div className="px-3 py-6 text-white/30 text-center text-[11px]">
                Waiting for API requests…
              </div>
            )}
            {entries.map((e) => {
              const time = new Date(e.ts).toLocaleTimeString('en', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const isExpanded = expandedIds.has(e.id);
              const hasDetail = Boolean(e.requestPreview || e.responsePreview || e.error);
              const statusText = e.kind === 'request' ? '--' : (e.status ?? 'ERR');
              const statusClass = e.kind === 'request' ? 'text-sky-300' : statusColor(e.status);
              const durationText = e.durationMs != null ? `${e.durationMs}ms` : '—';
              return (
                <div
                  key={e.id}
                  className={`px-3 py-1.5 border-b border-white/5 transition-colors ${hasDetail ? 'cursor-pointer hover:bg-white/5' : ''}`}
                  onClick={() => hasDetail && toggleExpand(e.id)}
                >
                  <div className="flex items-center gap-1.5">
                    {hasDetail && (
                      <span className="text-white/25 text-[9px] w-2.5">
                        {isExpanded ? '▾' : '▸'}
                      </span>
                    )}
                    <span className="text-white/30">{time}</span>
                    <span
                      className={`px-1 py-0.5 rounded text-[9px] font-bold text-white ${kindColor(e.kind)}`}
                    >
                      {kindLabel(e.kind)}
                    </span>
                    <span
                      className={`px-1 py-0.5 rounded text-[9px] font-bold text-white ${labelColor(e.url)}`}
                    >
                      {apiLabel(e.url)}
                    </span>
                    <span className="text-white/45">{e.method}</span>
                    <span className={`font-bold ${statusClass}`}>{statusText}</span>
                    <span className="text-white/30">{durationText}</span>
                    <span className="text-white/15 truncate flex-1 ml-1">
                      {e.url.split('?')[0].split('/api/').pop() ?? e.url}
                    </span>
                  </div>
                  {isExpanded && e.requestPreview && (
                    <div
                      className="mt-1 ml-4 p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 break-all whitespace-pre-wrap text-[10px] max-h-32 overflow-y-auto cursor-pointer hover:bg-sky-500/15 transition-colors relative"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        copyToClipboard(e.requestFull || e.requestPreview!, `req-${e.id}`);
                      }}
                      title="Click to copy"
                    >
                      {e.requestPreview}
                      {copiedId === `req-${e.id}` && (
                        <span className="absolute top-1 right-2 text-[9px] text-green-400 font-bold">
                          Copied!
                        </span>
                      )}
                    </div>
                  )}
                  {isExpanded && e.error && (
                    <div
                      className="mt-1 ml-4 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 break-all whitespace-pre-wrap text-[10px] cursor-pointer hover:bg-red-500/15 transition-colors relative"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        copyToClipboard(e.error!, `err-${e.id}`);
                      }}
                      title="Click to copy"
                    >
                      {e.error}
                      {copiedId === `err-${e.id}` && (
                        <span className="absolute top-1 right-2 text-[9px] text-green-400 font-bold">
                          Copied!
                        </span>
                      )}
                    </div>
                  )}
                  {isExpanded && e.responsePreview && (
                    <div
                      className="mt-1 ml-4 p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 break-all whitespace-pre-wrap text-[10px] max-h-48 overflow-y-auto cursor-pointer hover:bg-white/10 transition-colors relative"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        copyToClipboard(e.responseFull || e.responsePreview!, `res-${e.id}`);
                      }}
                      title="Click to copy"
                    >
                      {e.responsePreview}
                      {copiedId === `res-${e.id}` && (
                        <span className="absolute top-1 right-2 text-[9px] text-green-400 font-bold">
                          Copied!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
});

export default DevApiConsole;
