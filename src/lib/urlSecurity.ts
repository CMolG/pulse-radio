/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
/**
 * Checks whether a hostname resolves to a private/internal address.
 * Blocks loopback, link-local, and RFC 1918 private ranges to prevent SSRF.
 */
export function isPrivateHost(hostname: string): boolean { const host = hostname.toLowerCase();
  // Loopback
  if ( host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
    host === '0.0.0.0' || host.endsWith('.localhost')
  ) { return true; }
  // IPv4 private ranges (RFC 1918 + link-local + shared address space)
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) { const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16
    if (a === 169 && b === 254) return true;             // 169.254.0.0/16 (link-local)
    if (a === 100 && b >= 64 && b <= 127) return true;   // 100.64.0.0/10 (CGN)
    if (a === 127) return true;                          // 127.0.0.0/8
    if (a === 0) return true;                            // 0.0.0.0/8
  }
  // IPv6 private ranges (simplified check for bracketed or plain)
  const ipv6 = host.replace(/^\[/, '').replace(/\]$/, '');
  if (ipv6.startsWith('fe80:')) return true;             // link-local
  if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true; // unique local
  if (ipv6 === '::1' || ipv6 === '::') return true;
  // IPv6-mapped IPv4 (::ffff:A.B.C.D) — extract the embedded IPv4 and check it
  const mappedMatch = ipv6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mappedMatch) return isPrivateHost(mappedMatch[1]); return false;
}
