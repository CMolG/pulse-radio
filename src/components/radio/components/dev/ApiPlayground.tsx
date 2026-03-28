/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React, { useState, useRef } from 'react';

const _API_ENDPOINTS = [
  {
    label: 'ICY Metadata',
    path: '/api/icy-meta',
    params: [{ key: 'url', placeholder: 'Stream URL' }],
  },
  {
    label: 'iTunes Search',
    path: '/api/itunes',
    params: [{ key: 'term', placeholder: 'Artist - Song' }],
  },
  {
    label: 'iTunes Lookup',
    path: '/api/itunes/lookup',
    params: [{ key: 'id', placeholder: 'iTunes ID' }],
  },
  {
    label: 'Concerts',
    path: '/api/concerts',
    params: [{ key: 'artist', placeholder: 'Artist name' }],
  },
  {
    label: 'Artist Info',
    path: '/api/artist-info',
    params: [{ key: 'name', placeholder: 'Artist name' }],
  },
  {
    label: 'Lyrics',
    path: '/api/lyrics',
    params: [
      { key: 'artist', placeholder: 'Artist' },
      { key: 'title', placeholder: 'Song title' },
    ],
  },
  {
    label: 'Now Playing',
    path: '/api/now-playing',
    params: [{ key: 'stationuuid', placeholder: 'Station UUID' }],
  },
  { label: 'Trending', path: '/api/now-playing/trending', params: [] },
  {
    label: 'Station Health',
    path: '/api/station-health',
    params: [{ key: 'url', placeholder: 'Stream URL' }],
  },
  { label: 'Health', path: '/api/health', params: [] },
  { label: 'Analytics', path: '/api/analytics/summary', params: [] },
];

const ApiPlayground = React.memo(function ApiPlayground() {
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [customUrl, setCustomUrl] = useState('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [copiedPg, setCopiedPg] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);
  if (process.env.NODE_ENV !== 'development') return null;
  const endpoint = _API_ENDPOINTS[selectedIdx];
  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setDurationMs(null);
    const start = performance.now();
    try {
      let url: string;
      if (customUrl) {
        url = customUrl;
      } else {
        const qs = new URLSearchParams();
        for (const p of endpoint.params) {
          const v = paramValues[p.key];
          if (v) qs.set(p.key, v);
        }
        url = `${endpoint.path}${qs.toString() ? `?${qs}` : ''}`;
      }
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - start);
      setDurationMs(elapsed);
      setStatus(res.status);
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err: unknown) {
      setDurationMs(Math.round(performance.now() - start));
      setStatus(0);
      setResponse(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };
  const copyResponse = () => {
    if (response && navigator.clipboard) {
      navigator.clipboard.writeText(response).then(() => {
        setCopiedPg(true);
        setTimeout(() => setCopiedPg(false), 1500);
      });
    }
  };
  return (
    <div
      className="fixed bottom-50 left-2 z-9999 pointer-events-auto"
      style={{ maxWidth: 540, width: 'calc(100vw - 16px)', zIndex: 9999 }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-black/80 text-purple-400 border border-purple-500/30 hover:bg-black/90 transition-colors shadow-lg"
      >
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
        <span>API Playground</span>
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
            <span className="text-[11px] font-mono font-bold text-purple-400/80">
              🧪 API Playground
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-[12px] font-mono text-white/40 hover:text-white/70 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <select
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-white/80 outline-none focus:border-purple-500/50"
                value={selectedIdx}
                onChange={(e) => {
                  setSelectedIdx(Number(e.target.value));
                  setParamValues({});
                  setCustomUrl('');
                }}
              >
                {_API_ENDPOINTS.map((ep, i) => (
                  <option key={ep.path} value={i} className="bg-black text-white">
                    {ep.label} — {ep.path}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-white/60 outline-none focus:border-purple-500/50 placeholder:text-white/20"
              placeholder="Custom URL (overrides selection)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            {!customUrl && endpoint.params.length > 0 && (
              <div className="space-y-1.5">
                {endpoint.params.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40 w-16 text-right shrink-0">
                      {p.key}
                    </span>
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-white/70 outline-none focus:border-purple-500/50 placeholder:text-white/20"
                      placeholder={p.placeholder}
                      value={paramValues[p.key] ?? ''}
                      onChange={(e) =>
                        setParamValues((prev) => ({ ...prev, [p.key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') sendRequest();
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={sendRequest}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-purple-600/80 text-white hover:bg-purple-500/80 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending…' : 'Send'}
              </button>
              {status !== null && (
                <span
                  className={`text-[11px] font-mono font-bold ${status >= 200 && status < 300 ? 'text-green-400' : status === 0 ? 'text-red-400' : 'text-yellow-400'}`}
                >
                  {status} {durationMs != null && `(${durationMs}ms)`}
                </span>
              )}
              {response && (
                <button
                  onClick={copyResponse}
                  className="ml-auto text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors"
                >
                  {copiedPg ? '✓ Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          {response !== null && (
            <div
              ref={responseRef}
              className="border-t border-white/10 max-h-72 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              <pre className="text-[10px] font-mono text-white/50 whitespace-pre-wrap break-all leading-relaxed">
                {response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ApiPlayground;
