/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { describe, it, expect } from 'vitest';
import { stripPrototypeKeys, safeJsonParse } from '../sanitize';

describe('stripPrototypeKeys', () => {
  it('removes __proto__ from flat objects', () => {
    const obj = { __proto__: { polluted: true }, safe: 'value' };
    const result = stripPrototypeKeys(obj);
    expect(result).toEqual({ safe: 'value' });
    expect((result as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('removes constructor from flat objects', () => {
    const obj = { constructor: { polluted: true }, safe: 'value' };
    const result = stripPrototypeKeys(obj);
    expect(result).toEqual({ safe: 'value' });
  });

  it('removes prototype from flat objects', () => {
    const obj = { prototype: { polluted: true }, safe: 'value' };
    const result = stripPrototypeKeys(obj);
    expect(result).toEqual({ safe: 'value' });
  });

  it('removes all dangerous keys from nested objects', () => {
    const obj = {
      __proto__: { level1: true },
      nested: {
        constructor: { level2: true },
        data: 'value',
      },
    };
    const result = stripPrototypeKeys(obj);
    expect(result).toEqual({ nested: { data: 'value' } });
  });

  it('processes arrays and their elements', () => {
    const obj = {
      items: [
        { __proto__: { polluted: true }, id: 1 } as Record<string, unknown>,
        { constructor: { polluted: true }, id: 2 } as Record<string, unknown>,
      ],
    };
    const result = stripPrototypeKeys(obj);
    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }],
    });
  });

  it('preserves primitives', () => {
    expect(stripPrototypeKeys(null)).toBe(null);
    expect(stripPrototypeKeys(42)).toBe(42);
    expect(stripPrototypeKeys('string')).toBe('string');
    expect(stripPrototypeKeys(true)).toBe(true);
    expect(stripPrototypeKeys(undefined)).toBe(undefined);
  });

  it('preserves normal object properties', () => {
    const obj = {
      name: 'Artist',
      tags: ['rock', 'indie'],
      metadata: { year: 2024, verified: true },
    };
    const result = stripPrototypeKeys(obj);
    expect(result).toEqual(obj);
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    const result = safeJsonParse('{"name":"test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('prevents prototype pollution via __proto__', () => {
    // Before calling safeJsonParse, verify Object.prototype is clean
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    safeJsonParse('{"__proto__":{"polluted":true}}');

    // After safeJsonParse, Object.prototype should remain clean
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('prevents prototype pollution via constructor', () => {
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    safeJsonParse('{"constructor":{"prototype":{"polluted":true}}}');

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('prevents prototype pollution via nested paths', () => {
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    safeJsonParse('{"data":{"__proto__":{"polluted":true}}}');

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('preserves legitimate data in parsed result', () => {
    const json = '{"name":"Artist","tags":["rock","indie"],"__proto__":{"hacked":true}}';
    const result = safeJsonParse<{ name: string; tags: string[] }>(json);

    expect(result.name).toBe('Artist');
    expect(result.tags).toEqual(['rock', 'indie']);
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    expect((result as Record<string, unknown>).hacked).toBeUndefined();
  });

  it('throws on invalid JSON', () => {
    expect(() => safeJsonParse('invalid json')).toThrow();
  });
});
