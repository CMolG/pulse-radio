---
task_id: ARCH-021
target_agent: auto-optimizer
target_module: src/app/api/proxy-stream/route.ts
priority: medium
status: pending
---

# Block IPv4 Multicast Range in SSRF Protection

## Context

The SSRF protection in `proxy-stream/route.ts` and `icy-meta/route.ts` blocks private IPv4 ranges (10.x, 172.16-31.x, 192.168.x), link-local (169.254.x), carrier-grade NAT (100.64-127.x), loopback (127.x), and various IPv6 ranges. However, it does **not** block the IPv4 multicast range `224.0.0.0/4` (224.0.0.0 – 239.255.255.255). While multicast exploitation is unlikely in practice, defense-in-depth requires blocking all non-routable/reserved ranges.

Additionally, `.local` mDNS domains (e.g., `myserver.local`) are not blocked, though `localhost` variants are.

## Directive

1. In the `isPrivateIP()` function in both `proxy-stream/route.ts` and `icy-meta/route.ts`:
   - Add a check for IPv4 multicast: first octet >= 224 && first octet <= 239
2. In the hostname validation (where `localhost` is blocked):
   - Also block hostnames ending in `.local` (mDNS)
3. Keep all existing checks intact — this is additive only.
4. Both files should have identical SSRF logic. If the logic is duplicated, note this as a follow-up deduplication opportunity (but do NOT refactor in this task).
5. Run `npm run build` to verify.

## Acceptance Criteria

- [ ] Multicast range 224.0.0.0/4 blocked in both route files
- [ ] `.local` domains blocked in both route files
- [ ] All existing SSRF protections preserved
- [ ] `npm run build` passes with zero errors
