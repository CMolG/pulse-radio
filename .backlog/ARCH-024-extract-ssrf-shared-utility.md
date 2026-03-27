---
task_id: ARCH-024
target_agent: auto-reducer-finite
target_module: src/app/api/proxy-stream/route.ts
priority: medium
status: pending
---

# Extract Duplicated SSRF Protection into Shared Utility

## Context

`proxy-stream/route.ts` and `icy-meta/route.ts` contain 47 lines of identical SSRF protection code:
- `isPrivateHost()` function (33 lines) — checks IPv4 private ranges, IPv6 ranges, loopback, link-local
- 3 regex constants (`_IPV4_RE`, `_IPV6_MAPPED_RE`, `_IPV6_BRACKETS_RE`)
- Allowed protocols set
- Post-redirect hostname validation logic (~9 lines, conceptually identical)

Any security fix (e.g., ARCH-021 adding multicast blocking) must be applied in two places. This violates DRY and is a security maintenance risk.

## Directive

1. Create `src/lib/ssrf.ts` with:
   - The three regex constants (private, not exported)
   - `isPrivateHost(hostname: string): boolean` — the full implementation
   - `ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])` — exported
   - `validateStreamUrl(rawUrl: string | null, maxLength?: number): { url: URL } | { error: string }` — combines URL parsing, protocol check, and hostname check into one call
2. Update `proxy-stream/route.ts` to import from `@/lib/ssrf`.
3. Update `icy-meta/route.ts` to import from `@/lib/ssrf`.
4. Remove the duplicated code from both route files.
5. **Do NOT change any security behavior** — the exact same checks must run.
6. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] `src/lib/ssrf.ts` exists with shared SSRF utilities
- [ ] Both route files import from `@/lib/ssrf` instead of defining their own
- [ ] ~47 lines of duplication eliminated
- [ ] Security behavior identical — same IPs blocked, same protocols allowed
- [ ] `npm run build` passes with zero errors
