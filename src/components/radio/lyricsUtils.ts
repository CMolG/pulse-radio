/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import type { LyricsData } from "./types";

export type RenderableLyricLine = {
  id: string;
  text: string;
};

export function getActiveLyricIndex(
  lyrics: LyricsData | null,
  currentTime?: number,
) {
  if (currentTime == null || !lyrics?.synced || !lyrics.lines.length) return -1;

  let idx = -1;
  for (let i = 0; i < lyrics.lines.length; i++) {
    if (lyrics.lines[i].time <= currentTime) idx = i;
    else break;
  }

  return idx;
}

export function getRenderableLyricLines(
  lyrics: LyricsData | null,
): RenderableLyricLine[] {
  if (!lyrics) return [];

  if (lyrics.synced && lyrics.lines.length > 0) {
    return lyrics.lines.map((line, index) => ({
      id: `synced-${index}-${line.time}`,
      text: line.text || "♪",
    }));
  }

  if (!lyrics.plainText) return [];

  return lyrics.plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `plain-${index}`,
      text,
    }));
}
