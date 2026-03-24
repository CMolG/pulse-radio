/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IoRadioOutline, IoHeartOutline, IoMusicalNotesOutline, IoStatsChartOutline, IoSearchOutline,
  IoColorPaletteOutline, IoTimerOutline, IoGlobeOutline, IoChevronBack } from 'react-icons/io5';

const GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
};

interface GuideSection {
  icon: React.ReactNode;
  title: string;
  content: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    icon: <IoRadioOutline size={22} className="text-[#3478f6]" />,
    title: 'Listening to Radio',
    content: 'Browse stations by genre, country or search. Tap any station card to start playing. The visualizer activates automatically with live audio-reactive effects.',
  },
  {
    icon: <IoSearchOutline size={22} className="text-cyan-400" />,
    title: 'Search & Discover',
    content: 'Use the search bar to find stations by name, genre or location. Enable Discovery Mode (lightning icon) to auto-play random stations every 30 seconds.',
  },
  {
    icon: <IoHeartOutline size={22} className="text-pink-400" />,
    title: 'Favorites',
    content: 'Tap the star to save stations. Tap the heart to save songs. Filter your favorite songs by artist — songs are grouped in stacks you can expand.',
  },
  {
    icon: <IoMusicalNotesOutline size={22} className="text-purple-400" />,
    title: 'Lyrics & Track Info',
    content: 'Pulse detects the current song and fetches lyrics automatically. Tap on any song in history for detailed info including artist bio and album art.',
  },
  {
    icon: <IoColorPaletteOutline size={22} className="text-amber-400" />,
    title: 'Theater Mode',
    content: 'Press T or tap the theater button to enter immersive mode. The Fibonacci spiral visualizer reacts to the music with a CRT retro effect overlay.',
  },
  {
    icon: <IoStatsChartOutline size={22} className="text-emerald-400" />,
    title: 'Your Statistics',
    content: 'Pulse tracks your listening: time per station, most played songs, top artists and genres. Your home screen reorders sections based on what you listen to most.',
  },
  {
    icon: <IoTimerOutline size={22} className="text-orange-400" />,
    title: 'Sleep Timer',
    content: 'Press Z or use the timer icon to cycle through sleep durations (15, 30, 60, 90 min). Pulse will automatically stop playback when the timer ends.',
  },
  {
    icon: <IoGlobeOutline size={22} className="text-sky-400" />,
    title: 'Keyboard Shortcuts',
    content: 'Space: play/pause • ← →: skip station • ↑ ↓: volume • T: theater • E: equalizer • L: like song • S: star station • F: focus search • ?: show all shortcuts.',
  },
];

type Props = { onClose: () => void };

function UsageGuide({ onClose }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
        style={GLASS_STYLE}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pb-3">
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <IoChevronBack size={16} />
          </button>
          <h2 className="text-[17px] font-semibold text-white">How to use Pulse</h2>
        </div>

        <div className="border-t border-white/8" />

        {/* Guide sections */}
        <div className="px-5 py-4 space-y-2">
          {GUIDE_SECTIONS.map((section, idx) => {
            const isExpanded = expandedIdx === idx;
            return (
              <div key={idx} className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.03]">
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-shrink-0">{section.icon}</div>
                  <span className="text-[14px] font-medium text-white/80 flex-1">{section.title}</span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-white/30 text-[12px]"
                  >
                    ▶
                  </motion.span>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-3 text-[13px] text-white/50 leading-relaxed pl-[52px]">
                        {section.content}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}

export default React.memo(UsageGuide);
