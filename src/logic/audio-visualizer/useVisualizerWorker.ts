/* eslint-disable react-hooks/refs */
import { useRef, useCallback, useEffect } from 'react';
import type { VisualizerInput, VisualizerOutput } from './visualizer.worker';

export function useVisualizerWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbackRef = useRef<((data: VisualizerOutput) => void) | null>(null);
  const supportedRef = useRef(typeof Worker !== 'undefined');

  const start = useCallback((onData: (data: VisualizerOutput) => void) => {
    if (!supportedRef.current) return;

    callbackRef.current = onData;

    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(new URL('./visualizer.worker.ts', import.meta.url), {
          type: 'module',
        });
        workerRef.current.onmessage = (e: MessageEvent<VisualizerOutput>) => {
          callbackRef.current?.(e.data);
        };
      } catch {
        supportedRef.current = false;
      }
    }
  }, []);

  const postData = useCallback((frequencyData: Uint8Array, fftSize: number) => {
    if (!workerRef.current) return;
    const copy = new Uint8Array(frequencyData);
    const msg: VisualizerInput = { frequencyData: copy, fftSize };
    workerRef.current.postMessage(msg, { transfer: [copy.buffer] } as StructuredSerializeOptions);
  }, []);

  const stop = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    callbackRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  return { start, postData, stop, isSupported: supportedRef.current };
}
