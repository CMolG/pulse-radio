import { describe, it, expect } from 'vitest';
import { processFrequencyData } from '@/logic/audio-visualizer/visualizer.worker';

describe('processFrequencyData', () => {
  it('handles empty data', () => {
    const result = processFrequencyData(new Uint8Array(0), 2048);
    expect(result.rms).toBe(0);
    expect(result.peak).toBe(0);
    expect(result.dominantFrequency).toBe(0);
  });

  it('calculates RMS and peak', () => {
    const data = new Uint8Array([128, 255, 0, 64]);
    const result = processFrequencyData(data, 2048);
    expect(result.rms).toBeGreaterThan(0);
    expect(result.peak).toBeCloseTo(1, 1);
  });

  it('returns correct number of bands', () => {
    const data = new Uint8Array(128).fill(100);
    const result = processFrequencyData(data, 2048);
    expect(result.bands).toHaveLength(8);
    expect(result.bands[0]).toBeGreaterThan(0);
  });

  it('finds dominant frequency', () => {
    const data = new Uint8Array(128).fill(0);
    data[10] = 255; // spike at bin 10
    const result = processFrequencyData(data, 2048);
    expect(result.dominantFrequency).toBeGreaterThan(0);
  });
});
