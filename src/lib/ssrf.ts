/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { lookup } from 'dns/promises';

const _IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const _IPV6_MAPPED_RE = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i;
const _IPV6_BRACKETS_RE = /^\[|\]$/g;

/**
 * Returns true if the hostname resolves to a private, loopback, or
 * link-local address that should never be reached by outbound requests.
 */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }
  const ipv4Match = host.match(_IPV4_RE);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a >= 224 && a <= 239) return true;
  }
  const ipv6 = host.replace(_IPV6_BRACKETS_RE, '');
  if (ipv6.startsWith('fe80:')) return true;
  if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
  if (ipv6 === '::1' || ipv6 === '::') return true;
  const mappedMatch = ipv6.match(_IPV6_MAPPED_RE);
  if (mappedMatch) return isPrivateHost(mappedMatch[1]);
  return false;
}

export const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Parse and validate a stream URL: checks format, protocol, and SSRF.
 * Returns either a valid URL or a human-readable error string.
 */
export function validateStreamUrl(
  rawUrl: string | null,
  maxLength = 2048,
): { url: URL; error?: undefined } | { url?: undefined; error: string } {
  if (!rawUrl || rawUrl.length > maxLength) {
    return { error: 'Missing or invalid url parameter' };
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: 'Invalid URL' };
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { error: 'Invalid protocol' };
  }
  if (isPrivateHost(url.hostname)) {
    return { error: 'Private/internal URLs not allowed' };
  }
  return { url };
}

/**
 * Resolve hostname via DNS and validate that the resolved IP is not private.
 * Protects against DNS rebinding attacks by resolving before fetch().
 * Throws an error if the resolved IP is in private ranges.
 */
export async function resolveDnsAndValidate(hostname: string): Promise<string> {
  try {
    const { address } = await lookup(hostname, { family: 4 });
    if (isPrivateHost(address)) {
      throw new Error(`Resolved to private IP: ${address}`);
    }
    return address;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Resolved to private IP')) {
      throw err;
    }
    throw new Error(`DNS resolution failed or private IP detected for ${hostname}`);
  }
}
