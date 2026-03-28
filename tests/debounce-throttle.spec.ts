import { test, expect } from '@playwright/test';
import { debounce } from '../src/logic/debounce';
import { throttle } from '../src/logic/throttle';

test.describe('Debounce & Throttle Utilities (ARCH-141)', () => {
  test('debounce delays execution until idle', async () => {
    const calls: number[] = [];
    const fn = debounce((v: number) => calls.push(v), 100);
    fn(1); fn(2); fn(3);
    await new Promise(r => setTimeout(r, 200));
    expect(calls).toEqual([3]);
  });

  test('debounce flush executes immediately', async () => {
    const calls: number[] = [];
    const fn = debounce((v: number) => calls.push(v), 5000);
    fn(42);
    fn.flush();
    expect(calls).toEqual([42]);
  });

  test('debounce cancel prevents execution', async () => {
    const calls: number[] = [];
    const fn = debounce((v: number) => calls.push(v), 50);
    fn(1);
    fn.cancel();
    await new Promise(r => setTimeout(r, 100));
    expect(calls).toEqual([]);
  });

  test('throttle limits execution frequency', async () => {
    const calls: number[] = [];
    const fn = throttle((v: number) => calls.push(v), 200);
    fn(1); fn(2); fn(3);
    await new Promise(r => setTimeout(r, 300));
    expect(calls.length).toBe(2);
    expect(calls[0]).toBe(1);
  });

  test('throttle cancel stops pending execution', async () => {
    const calls: number[] = [];
    const fn = throttle((v: number) => calls.push(v), 200);
    fn(1); // fires immediately
    fn(2); // scheduled
    fn.cancel();
    await new Promise(r => setTimeout(r, 300));
    expect(calls).toEqual([1]); // only the leading-edge call
  });
});
