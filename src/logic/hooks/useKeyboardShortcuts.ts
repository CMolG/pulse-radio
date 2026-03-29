/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onPlayPause?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onEscape?: () => void;
  onTheaterToggle?: () => void;
  onLyricsToggle?: () => void;
  onShowHelp?: () => void;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTyping()) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlers.onPlayPause?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlers.onVolumeUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlers.onVolumeDown?.();
          break;
        case 'm':
        case 'M':
          handlers.onMute?.();
          break;
        case 'Escape':
          handlers.onEscape?.();
          break;
        case 't':
        case 'T':
          handlers.onTheaterToggle?.();
          break;
        case 'l':
        case 'L':
          handlers.onLyricsToggle?.();
          break;
        case '?':
        case '/':
          e.preventDefault();
          handlers.onShowHelp?.();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
