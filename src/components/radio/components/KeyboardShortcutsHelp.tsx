/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React from "react";
import { X } from "lucide-react";

const SHORTCUTS = [ { key: "Space", desc: "Play / Pause" }, { key: "←", desc: "Previous station" },
  { key: "→", desc: "Next station" },
  { key: "↑", desc: "Volume up" },
  { key: "↓", desc: "Volume down" },
  { key: "M", desc: "Mute / Unmute" },
  { key: "F", desc: "Focus search" },
  { key: "S", desc: "Favorite station" },
  { key: "L", desc: "Like current song" },
  { key: "R", desc: "Toggle realtime lyrics sync" },
  { key: "T", desc: "Theater mode" },
  { key: "E", desc: "Equalizer" },
  { key: "Z", desc: "Cycle sleep timer" },
  { key: "Esc", desc: "Close panel / exit theater" },
  { key: "?", desc: "Toggle this help" },
];

interface Props { onClose: () => void; }

export const KeyboardShortcutsHelp = React.memo(function KeyboardShortcutsHelp({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}>
      <div
        className="bg-surface-2 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-3 transition-colors text-secondary"
            aria-label="Close shortcuts help">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-1 px-1">
              <span className="text-[13px] text-secondary">{desc}</span>
              <kbd className="text-[12px] font-mono bg-surface-3 text-white px-2 py-0.5 rounded-md min-w-[2rem] text-center">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
