/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

export interface LyricLine {
  time: number;
  text: string;
}

export function parseLrc(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const tsRegex = /\[(\d{1,3}):(\d{2})\.(\d{2,3})\]/g;
  for (const raw of lrcText.split('\n')) {
    const timestamps: number[] = [];
    let lastIndex = 0;
    let m;
    tsRegex.lastIndex = 0;
    while ((m = tsRegex.exec(raw)) !== null) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseInt(m[2], 10);
      if (seconds >= 60) continue; // invalid timestamp
      const centiseconds = parseInt(m[3].padEnd(3, '0'), 10);
      timestamps.push(minutes * 60 + seconds + centiseconds / 1000);
      lastIndex = tsRegex.lastIndex;
    }
    if (timestamps.length === 0) continue;
    const text = raw.slice(lastIndex).trim();
    if (!text) continue;
    for (const time of timestamps) {
      lines.push({ time, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
