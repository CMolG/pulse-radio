/**
 * Web Worker for audio visualizer FFT post-processing.
 * Receives raw frequency data, returns processed amplitude/band data.
 */

export interface VisualizerInput {
  frequencyData: Uint8Array;
  fftSize: number;
}

export interface VisualizerOutput {
  rms: number;
  peak: number;
  bands: Float32Array;
  dominantFrequency: number;
}

const BAND_COUNT = 8;

function processFrequencyData(data: Uint8Array, fftSize: number): VisualizerOutput {
  const len = data.length;
  if (len === 0) {
    return { rms: 0, peak: 0, bands: new Float32Array(BAND_COUNT), dominantFrequency: 0 };
  }

  // RMS amplitude
  let sumSq = 0;
  let peak = 0;
  let maxIdx = 0;
  let maxVal = 0;

  for (let i = 0; i < len; i++) {
    const val = data[i] / 255;
    sumSq += val * val;
    if (val > peak) peak = val;
    if (data[i] > maxVal) {
      maxVal = data[i];
      maxIdx = i;
    }
  }
  const rms = Math.sqrt(sumSq / len);

  // Frequency bands (logarithmic distribution)
  const bands = new Float32Array(BAND_COUNT);
  const bandSize = Math.ceil(len / BAND_COUNT);
  for (let b = 0; b < BAND_COUNT; b++) {
    const start = b * bandSize;
    const end = Math.min(start + bandSize, len);
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i] / 255;
    }
    bands[b] = sum / (end - start);
  }

  // Dominant frequency estimate (simplified)
  const nyquist = 44100 / 2; // assume 44.1kHz sample rate
  const binWidth = nyquist / (fftSize / 2);
  const dominantFrequency = maxIdx * binWidth;

  return { rms, peak, bands, dominantFrequency };
}

// Worker message handler
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (e: MessageEvent<VisualizerInput>) => {
    const result = processFrequencyData(e.data.frequencyData, e.data.fftSize);
    self.postMessage(result, { transfer: [result.bands.buffer] } as StructuredSerializeOptions);
  };
}

export { processFrequencyData };
